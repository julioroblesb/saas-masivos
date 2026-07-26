# Reporte de etapa 08 — Evolution API y WhatsApp

## 1. Rama

- Nombre: `refactor/08-evolution-provider`
- Commit inicial: `6bdc2e7`
- Commit final: se completa al cerrar la etapa
- PR: integración acumulativa pendiente para la publicación final solicitada en `main`

## 2. Objetivo ejecutado

Evolution quedó aislado detrás de la interfaz `WhatsAppProvider`. El adaptador valida
entradas y respuestas con Zod, limita tiempos, reintenta únicamente lecturas seguras,
abre un circuit breaker ante fallos repetidos y nunca reintenta envíos que podrían
duplicar mensajes.

Se agregó un ledger durable para deduplicar webhooks, validación estricta entre
instancia y tenant, límite de payload, hash SHA-256 sin almacenar el cuerpo y
liberación de claims fallidos para permitir reentrega.

## 3. Compatibilidad fijada

La versión compatible documentada es Evolution API `2.3.7`, última línea estable
previa a la activación/licenciamiento introducidos en 2.4. Esto preserva la ruta de
costo cero. La imagen Docker se fijará a esta versión en la etapa de infraestructura.

## 4. Base de datos

- Migración: `20260726173205_evolution_webhook_idempotency.sql`
- Aplicada en Supabase como `20260726173205_evolution_webhook_idempotency`.
- Tabla: `public.wa_webhook_events`.
- RPC service-only:
  - `rpc_claim_evolution_webhook`
  - `rpc_complete_evolution_webhook`
- RLS habilitado sin políticas públicas.
- `anon` y `authenticated`: sin privilegios de tabla ni ejecución.
- `service_role`: acceso explícito.
- Retención: siete días; el cron gratuito existente elimina registros vencidos.

La migración se validó primero dentro de `BEGIN ... ROLLBACK`. Se comprobó que el
primer claim devuelve `true`, el repetido `false`, la finalización marca
`processed_at`, los roles públicos no acceden y el rollback retiró todos los objetos.

## 5. Contratos y resiliencia

- Nombres de instancia, teléfonos, URLs, texto, QR, estado y recibos se validan.
- Timeout por solicitud: 15 segundos.
- Lecturas: hasta tres intentos con backoff exponencial y jitter.
- Envíos y mutaciones: un solo intento para evitar doble entrega.
- Circuit breaker: abre 30 segundos después de cinco fallos transitorios.
- Los errores del proveedor se normalizan y no exponen cuerpos, credenciales ni URLs.
- Los webhooks mayores de 1 MB se rechazan.
- El `company_id` enviado por cabecera se contrasta con la sesión de la instancia.
- La clave de idempotencia prioriza el ID de mensaje y usa el hash como fallback.

## 6. Pruebas

```text
next typegen
tsc --noEmit
vitest run
eslint src/integrations/evolution src/integrations/whatsapp src/app/api/wa
```

Resultado al cierre técnico:

- TypeScript: cero errores.
- Vitest: 30/30 pruebas aprobadas.
- Lint focalizado: cero errores; los dos avisos restantes de la ruta de estado se
  retiraron antes del cierre.
- Validación SQL transaccional: aprobada.
- Permisos live: RLS `true`, `anon_select=false`, `authenticated_select=false`,
  `service_insert=true`, `anon_claim=false`, `service_claim=true`.

## 7. Advisors

El nuevo ledger solo agrega el aviso informativo `RLS enabled no policy`, que es
intencional: la tabla es exclusivamente service-only. El índice de expiración aparece
como no usado porque aún no ha ocurrido la primera limpieza. Los avisos legacy de
funciones y políticas se mantienen registrados; el catálogo directo confirma que los
grants endurecidos de etapas previas están activos aunque el advisor conserve entradas
en caché.

## 8. Rollback

1. Revertir el commit de la etapa para restaurar el cliente Evolution anterior.
2. Mantener la tabla durante la reversión de aplicación: es aditiva y no interfiere.
3. Tras confirmar que ningún despliegue usa las RPC, retirar funciones y tabla en una
   migración posterior. No se elimina en el mismo despliegue.

## 9. Riesgos pendientes

- No fue posible ejecutar pruebas contra un servidor Evolution real desde este
  entorno; los contratos se probaron con dobles HTTP. El smoke test real se ejecutará
  al despliegue.
- El contador de respuestas de campaña aún debe convertirse en una operación
  transaccional; corresponde a la etapa 10.
- El estado durable y la recuperación completa de envíos corresponde a la etapa 09.

## 10. Declaración

Los cambios se limitaron al adaptador WhatsApp, rutas consumidoras, idempotencia de
webhooks y su retención. No se almacenan payloads ni datos sensibles nuevos.
