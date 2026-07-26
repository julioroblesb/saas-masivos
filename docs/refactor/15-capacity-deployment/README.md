# Etapa 15: capacidad y despliegue

## Escenarios automatizados

`npm run load:test` ejecuta escalones de 5, 10 y 20 tenants virtuales contra
`/api/health`, con concurrencia configurable, timeout, tasa de éxito y
percentiles p50/p95/p99. La prueba falla si el éxito es menor a 99 % o p95
supera 1 segundo.

pgTAP agrega 20 tenants y comprueba que la cola:

- reclama un trabajo transaccional por tenant;
- mantiene equidad entre tenants;
- no permite una segunda reclamación mientras existe un lease activo.

Los contratos simulados cubren texto, multimedia, QR, errores, reintentos,
circuit breaker, replay de webhooks y recuperación de leases.

## Resultado HTTP local

Ejecución del 26 de julio de 2026 contra el build de producción local, con 20
solicitudes concurrentes:

| Tenants | Solicitudes | Éxito |    p50 |    p95 |    p99 | Máxima |
| ------: | ----------: | ----: | -----: | -----: | -----: | -----: |
|       5 |         100 | 100 % | 211 ms | 322 ms | 348 ms | 354 ms |
|      10 |         200 | 100 % | 150 ms | 198 ms | 213 ms | 218 ms |
|      20 |         400 | 100 % | 118 ms | 160 ms | 178 ms | 222 ms |

Los tres escalones aprobaron el presupuesto p95 de 1 segundo. Esta prueba mide
la disponibilidad HTTP de la aplicación; no se presenta como sustituto de una
campaña real de WhatsApp.

## Ejecución

```bash
LOAD_BASE_URL=https://staging.example.com npm run load:test
supabase test db
infra/evolution/scripts/monitor-host.sh
docker stats --no-stream
```

Para una campaña piloto se registran al inicio, durante el pico y cinco minutos
después: RSS/CPU/PIDs de cada contenedor, swap, temperatura, batería,
profundidad/edad de cola, p95 y errores del proveedor.

## Límites de lanzamiento

La única medición real disponible del host fue una sesión Evolution con
aproximadamente 263 MiB; PostgreSQL 53 MiB y Redis 13 MiB, sobre un equipo con
3.4 GiB de RAM. No existe evidencia real suficiente para prometer 20 sesiones
WhatsApp simultáneas.

Por seguridad, el lanzamiento queda limitado inicialmente a:

- 5 sesiones WhatsApp activas simultáneas;
- 1 campaña procesándose por tenant;
- prioridad para mensajes transaccionales;
- máximo 5 intentos y dead-letter posterior;
- promoción a 10 sesiones únicamente después de 72 horas bajo 70 % RAM,
  menos de 1 % de error y sin temperatura sostenida sobre 80 °C.

Veinte tenants pueden existir en la aplicación; el límite se refiere a sesiones
WhatsApp activas en el servidor doméstico.

## Despliegue progresivo

1. Reconstruir base y ejecutar CI/E2E.
2. Aplicar migraciones aditivas.
3. Desplegar staging y ejecutar carga de 5/10/20 tenants.
4. Habilitar tenant interno durante 24 horas.
5. Habilitar uno o dos pilotos durante 48 horas.
6. Promover el resto solo si health, cola y proveedor permanecen dentro de SLO.

Rollback:

1. detener nuevos claims;
2. volver al commit/tag de aplicación anterior;
3. conservar migraciones aditivas y volúmenes;
4. reanudar mensajes transaccionales;
5. verificar `/api/health`, estado Evolution y edad de cola.

## Bloqueos externos observados

GitHub Actions no inició los jobs porque la cuenta GitHub está bloqueada por un
problema de facturación. El workflow permanece listo, pero no se propone pagar:
se usa validación local/open source hasta que el propietario resuelva el estado
de la cuenta sin contratar capacidad.

El host Evolution tampoco es alcanzable por SSH/Tailscale desde este entorno.
Por eso no se declara aprobada una prueba real de 20 QR, reconexiones o
restauración; hacerlo sin evidencia sería inventar capacidad.
