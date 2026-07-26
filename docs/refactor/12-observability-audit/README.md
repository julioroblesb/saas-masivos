# Etapa 12 — Observabilidad y auditoría

## Implementación

- Logs de una línea en JSON con `timestamp`, `level`, `event`, `service`, `correlationId`, `tenantId` y `operation`.
- Redacción recursiva de secretos, credenciales, cookies, teléfonos, correos, mensajes, payloads y códigos QR.
- Correlation ID aceptado desde `x-correlation-id` y devuelto por las rutas instrumentadas.
- Eventos de cola para mensajes enviados, fallidos, reintentables y ejecuciones completas.
- Eventos de webhook para duplicados, procesados y fallos.
- Auditoría durable para operaciones de superadmin con RLS, acceso exclusivo de `service_role` y retención configurable.
- `GET /api/health` como liveness público sin detalles internos.
- `GET /api/health?deep=1` autenticado con `INTERNAL_TOKEN`, con estado de Supabase, sesiones de Evolution, profundidad y atraso de cola y resultados de mensajes en 24 horas.
- Estado HTTP `503` si existe dead-letter o el mensaje pendiente más antiguo supera 15 minutos.

## Retención

- La salida JSON se dirige a stdout/stderr y la etapa 14 limita y rota esos archivos en Docker.
- La auditoría se conserva 90 días por defecto.
- `rpc_purge_expired_audit_events(90)` elimina auditoría vencida; solo puede ejecutarla `service_role`.
- Ningún evento debe contener nombres, correos, teléfonos, texto de mensajes, tokens o payloads de proveedor.

## Validación

```text
TypeScript: 0 errores
Vitest: 8 archivos, 38 pruebas aprobadas
Pruebas de redacción: secretos y datos de contacto eliminados
```

No se añadió ningún proveedor de observabilidad de pago. El endpoint profundo y los logs JSON funcionan con GitHub Actions y el servidor autohospedado.
