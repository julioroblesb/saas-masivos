# Reporte de etapa 10 — Flujos de negocio transaccionales

## 1. Rama

- Nombre: `refactor/10-business-rules`
- Commit inicial: `90ffbce`
- Commit final: se completa al cerrar la etapa
- PR: integración acumulativa pendiente para la publicación final en `main`

## 2. Objetivo ejecutado

Los flujos que afectan atención, cobranza, campañas y contactos se movieron a
funciones transaccionales de PostgreSQL. La aplicación ya no coordina escrituras
parciales entre varias llamadas HTTP.

## 3. Base de datos

- Migración: `20260726181050_transactional_business_workflows.sql`.
- Estado: validada junto con la migración de cola mediante transacciones con
  `ROLLBACK`; se aplicará en la misma ventana que el despliegue compatible.
- No se creó ninguna rama de pago ni recurso adicional de Supabase.

Operaciones:

- `rpc_complete_visit`: completa, cobra, calcula deuda, actualiza métricas y segmento,
  crea mensajes idempotentes y registra el evento en una sola transacción.
- `rpc_add_visit_payment`: bloquea la atención, impide sobrepagos, inserta con clave de
  idempotencia y recalcula el estado de pago.
- `rpc_set_visit_outcome`: cancela o marca inasistencia sin borrar la atención, pagos
  ni evidencia; cancela mensajes pendientes.
- `rpc_create_campaign`: acepta la firma real del frontend, valida hasta 500
  destinatarios y crea toda la secuencia de cola de forma atómica.
- `rpc_mark_campaign_reply`: marca la respuesta e incrementa el contador sin una
  carrera read-modify-write.
- `rpc_delete_marketing_contact`: archiva el contacto y cancela mensajes pendientes;
  no rompe el historial clínico o financiero.

## 4. Trazabilidad

`spa_visit_events` conserva los eventos de finalización, cancelación e inasistencia.
Los pagos incorporan `source` e `idempotency_key`. Las funciones operativas exponen
solo los permisos mínimos: usuario autenticado para acciones de negocio y
`service_role` para el webhook.

## 5. Aplicación

- Finalizar una atención usa una sola RPC validada con Zod.
- Registrar un abono usa una sola RPC y una clave de solicitud aleatoria.
- “Eliminar” una atención equivale a cancelarla y preservar su historial.
- “Eliminar” un contacto equivale a archivarlo.
- El webhook delega el conteo de respuestas a PostgreSQL.
- Se eliminó el programador duplicado de mensajes que vivía en la acción del servidor.

## 6. Pruebas

Validaciones sobre la base real, todas revertidas:

- esquema de etapas 09 y 10 aplicable como una unidad;
- finalización repetida sin duplicar pago ni mensajes;
- campaña con contacto y teléfono directo, con cancelación no destructiva;
- respuesta de campaña contabilizada atómicamente;
- archivado de contacto conservando visitas;
- cancelación repetida con un solo evento de auditoría;
- pago repetido con la misma clave generando una sola fila;
- rol anónimo sin acceso a las operaciones autenticadas.

TypeScript finalizó sin errores. El cierre de la etapa ejecuta además lint, pruebas y
build de producción.

## 7. Despliegue y rollback

Esta migración depende del modelo canónico de la etapa 05 y de la cola de la etapa 09.
Las migraciones pendientes se aplicarán inmediatamente antes de publicar la aplicación
compatible. Si la aplicación no supera las verificaciones, no se aplican.

Después de aplicar, el rollback operativo consiste en desplegar la versión compatible
anterior manteniendo las columnas aditivas. No se eliminan datos ni columnas en
caliente.
