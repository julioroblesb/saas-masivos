# Inventario de Integraciones Externas

## 1. Integraciones Activas en el Sistema

### 1. Evolution API v2.2.3
* **Función**: Motor de conexión WhatsApp basado en Baileys desplegado en el servidor Linux doméstico (`servidor-julio`).
* **Cliente**: Centralizado en `src/integrations/evolution/client.ts`.
* **Endpoints HTTP invocados**:
  - `POST /instance/create`: Inicialización de instancia (`syncFullHistory: false`, `integration: 'WHATSAPP-BAILEYS'`).
  - `POST /webhook/set/{instanceName}`: Registro del webhook con objeto wrapper `{ webhook: { enabled, url, headers, events } }`.
  - `GET /instance/connectionState/{instanceName}`: Consulta de estado de socket Baileys.
  - `GET /instance/connect/{instanceName}`: Obtención de código QR en base64.
  - `POST /message/sendText/{instanceName}`: Envío de mensaje de texto `{ number, text, delay }`.
  - `POST /message/sendMedia/{instanceName}`: Envío de archivo multimedia `{ number, mediatype: 'image', media, caption, delay }`.
  - `DELETE /instance/logout/{instanceName}`: Desconexión de sesión Baileys.
  - `DELETE /instance/delete/{instanceName}`: Destrucción de instancia.

### 2. Cloudflare Access & Cloudflare Tunnel
* **Función**: Exposición segura y cifrada del servicio `127.0.0.1:8080` de la laptop hacia Vercel (`https://evolution.dominio.com`).
* **Autenticación Service Auth**: Cabeceras `CF-Access-Client-Id` y `CF-Access-Client-Secret`.

### 3. Vercel Cron
* **Función**: Disparador programado invocando `/api/cron/process-queue` mediante cabecera Bearer `CRON_SECRET`.
