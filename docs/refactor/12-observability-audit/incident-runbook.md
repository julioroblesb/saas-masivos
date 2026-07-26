# Runbook de incidentes

## 1. Confirmar alcance

1. Consultar `GET /api/health` para verificar que el proceso responde.
2. Consultar `GET /api/health?deep=1` con `Authorization: Bearer $INTERNAL_TOKEN`.
3. Guardar el `x-correlation-id` de la respuesta.
4. Revisar logs por ese `correlationId`; no copiar payloads ni credenciales.

## 2. Cola atrasada

- `oldestPendingSeconds > 900`: pausar nuevas campañas y ejecutar una sola invocación autenticada de `/api/cron/process-queue`.
- `deadLetter > 0`: buscar `queue.message_failed` por tenant y `errorCode`.
- Confirmar primero conectividad de Evolution y vigencia de la suscripción.
- No reinsertar manualmente mensajes: usar los estados y reintentos durables de la cola.

## 3. Evolution degradado

- Revisar `degradedSessions` y los eventos `evolution.webhook_failed`.
- Verificar contenedores, Redis y PostgreSQL de Evolution.
- Reiniciar solo el servicio afectado y confirmar el healthcheck.
- No borrar sesiones ni volver a vincular un número sin aprobación del dueño.

## 4. Supabase degradado

- Si el healthcheck profundo responde `503` sin métricas, comprobar estado y cuota del proyecto.
- Revisar consultas lentas e índices antes de aumentar recursos.
- No ejecutar migraciones de reparación fuera del flujo versionado.

## 5. Cierre

- Confirmar healthcheck profundo en `200`.
- Confirmar que la profundidad de cola disminuye.
- Registrar inicio, fin, correlation IDs, causa y acción correctiva en el informe del incidente.
- Ejecutar `rpc_purge_expired_audit_events(90)` en el mantenimiento programado.
