# Inventario de Integraciones Externas e Infraestructura

## 1. Versiones Reales de la Infraestructura en Vivo (`servidor-julio` @ `100.72.75.79`)

- **VERIFICADO**: **Evolution API Engine**: `evoapicloud/evolution-api:v2.3.7` (Contenedor Docker `evolution_api`, 262.8MiB RAM, 27 PIDs, `healthy`).
- **VERIFICADO**: **Evolution PostgreSQL**: `postgres:15-alpine` (Contenedor Docker `evolution_postgres`, 52.82MiB RAM, 10 PIDs, `healthy`).
- **VERIFICADO**: **Evolution Redis**: `redis:7-alpine` (Contenedor Docker `evolution_redis`, 13.11MiB RAM, 6 PIDs, `healthy`).
- **VERIFICADO**: **Estado de Servicios de Sistema (`systemctl is-active`)**:
  - `docker`: **active**
  - `cloudflared`: **activating** *(servicio tunnel en proceso de reconexión/inicio)*
  - `tailscaled`: **active**

---

## 2. Abstracción HTTP de Evolution API v2.3.7 (`src/integrations/evolution/client.ts`)

Endpoints invocados con payload estructurado plano para la v2.3.7:
- `POST /instance/create`: `{ instanceName, syncFullHistory: false, integration: 'WHATSAPP-BAILEYS' }`.
- `POST /webhook/set/{instanceName}`: `{ webhook: { enabled: true, url, headers, events } }`.
- `GET /instance/connectionState/{instanceName}`.
- `GET /instance/connect/{instanceName}`.
- `POST /message/sendText/{instanceName}`: Body plano `{ number, text, delay }`.
- `POST /message/sendMedia/{instanceName}`: `{ number, mediatype, media, caption, delay }`.
- `DELETE /instance/logout/{instanceName}`.
- `DELETE /instance/delete/{instanceName}`.
