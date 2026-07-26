# Reporte de etapa 09 — Cola y programación confiable

## 1. Rama

- Nombre: `refactor/09-durable-queue`
- Commit inicial: `99359d2`
- Commit final: se completa al cerrar la etapa
- PR: integración acumulativa pendiente para la publicación final en `main`

## 2. Objetivo ejecutado

El cron de 286 líneas y ciclos de hasta 45 segundos fue sustituido por un despertador
breve. Cada tenant procesa como máximo un mensaje por invocación y la coordinación
durable vive en PostgreSQL.

Estados canónicos:

```text
queued
leased
processing
sent
retry_scheduled
failed
dead_letter
cancelled
```

## 3. Base de datos

- Migración: `20260726174750_durable_message_queue.sql`.
- Estado: validada con transacción y rollback; no aplicada todavía porque requiere
  desplegar simultáneamente los consumidores con estados canónicos.
- Filas antes y después del rollback: 41.
- Pendientes legacy restaurados tras rollback: 3.

Campos incorporados:

```text
attempt_count
max_attempts
lease_owner
lease_expires_at
next_attempt_at
idempotency_key
provider_message_id
last_error_code
last_error_at
priority
message_type
```

RPC service-only:

- `rpc_claim_queue_item`: `FOR UPDATE SKIP LOCKED`, lease y una sola ejecución
  concurrente por tenant.
- `rpc_mark_queue_processing`: transición protegida por owner y vencimiento.
- `rpc_complete_queue_item`: finalización y contador de campaña atómicos.
- `rpc_fail_queue_item`: backoff exponencial, jitter y transición a failed/dead-letter.
- `rpc_record_queue_send_success` y `rpc_record_queue_send_failure`: contadores de
  sesión atómicos.

Las funciones de campaña compatibles pasan a crear `queued` y cancelar conservando
historial, sin borrar mensajes.

## 4. Worker

- `QueueRepository`: único gateway a las RPC y al contexto del mensaje.
- `QueueWorker`: límites diarios, ventana horaria, envío, transición y registro de
  resultado.
- La ruta cron solo autentica, obtiene sesiones y despierta workers en grupos de cinco.
- No hay sleeps ni loops de 45 segundos.
- Mensajes transaccionales tienen prioridad 200 y pueden enviarse fuera de la ventana
  de campañas; campañas usan prioridad 100 y horario 08:00–20:00 Lima.
- Los envíos no se reintentan dentro de la llamada HTTP. PostgreSQL programa el
  siguiente intento.

## 5. Idempotencia y cancelación

Los mensajes de cuidados y seguimiento usan claves determinísticas por visita y
`UPSERT ... ignoreDuplicates`, evitando duplicados si una acción se repite. La UI
cancela mensajes mediante estado `cancelled`; ya no elimina evidencia de la cola.

El modelo es at-least-once. Si Evolution acepta un mensaje y el proceso muere antes de
confirmarlo, puede existir ambigüedad. El `provider_message_id` se conserva cuando la
confirmación termina correctamente; no se promete exactly-once.

## 6. Pruebas

```text
next typegen
tsc --noEmit
vitest run src/server/queue/queue-worker.test.ts
```

Resultados:

- TypeScript: cero errores.
- Worker: 6/6 pruebas aprobadas.
- Migración completa en rollback:
  - un primer worker reclama;
  - un segundo worker no puede reclamar dentro del mismo tenant;
  - un owner incorrecto no puede iniciar;
  - un error transitorio programa retry;
  - el segundo intento completa con `attempt_count=2`;
  - se conserva `provider_message_id`;
  - authenticated no puede ejecutar claims;
  - service_role sí puede completar.

## 7. Compatibilidad y despliegue

La migración transforma:

```text
pendiente → queued
enviando → retry_scheduled
enviado → sent
fallido → failed
cancelado → cancelled
```

Debe aplicarse en la misma ventana que la aplicación compatible. No se aplicará antes
para no romper inserciones de la versión actualmente desplegada.

## 8. Rollback

Antes de aplicar, basta revertir el commit. Después de aplicar, el rollback seguro es
desplegar primero un adaptador que acepte ambos vocabularios; las columnas nuevas no se
eliminan en caliente. La retirada física se haría en una migración posterior.

## 9. Riesgos pendientes

- La creación de campañas del frontend usa hoy una firma RPC inexistente en
  producción; se corrige en la etapa 10.
- El incremento de respuestas del webhook aún es read-modify-write; se vuelve
  transaccional en la etapa 10.
- La vista de mensajería conserva deuda de tipos y hooks que se elimina en la etapa 11.
- La migración debe coordinarse con la migración de roles de la etapa 06 al despliegue.

## 10. Declaración

La etapa se limitó a durabilidad, concurrencia, reintentos, idempotencia, programación
y consumidores directos de estados de cola.
