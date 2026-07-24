# Registro de Rotación de Credenciales

Este documento registra el inventario de credenciales y secretos de acceso utilizados temporalmente durante las etapas de refactorización. Ninguna credencial será rotada durante la Etapa 01; la rotación y limpieza definitiva se ejecutará en la etapa de seguridad previa a producción.

---

## Matriz de Registro y Planificación de Rotación

| Credencial / Secret | Sistema / Servicio | ¿Está Versionada en Git? | Rotación Requerida | Etapa Programada |
| :--- | :--- | :---: | :---: | :---: |
| **Usuarios de Auditoría RLS (`silvana@`, `francisco@`)** | Supabase Auth | Sí | Sí | Preproducción |
| **Supabase Service Role Key** | Supabase Project (`ywpafptrcvgoyaoqgzkz`) | Sí (Histórico) | Sí | Preproducción |
| **Supabase Publishable / Anon Key** | Supabase Project (`ywpafptrcvgoyaoqgzkz`) | Sí | Sí | Preproducción |
| **Evolution API Secret Key (`EVOLUTION_API_KEY`)** | Servidor Linux / Docker | Sí | Sí | Preproducción |
| **Internal Webhook Secret Token (`INTERNAL_TOKEN`)** | Next.js API Routes / Evolution | Sí | Sí | Preproducción |
| **Vercel Cron Secret (`CRON_SECRET`)** | Vercel Deployment | Sí | Sí | Preproducción |
| **Credenciales SSH de Servidor Linux** | Servidor `servidor-julio` (100.72.75.79) | Sí (Histórico) | Sí | Preproducción |
| **GitHub Personal Access Token (PAT)** | GitHub Repository | Sí (Histórico) | Sí | Preproducción |

---

## Procedimiento de Seguridad para Preproducción

Al alcanzar la etapa final de seguridad antes del lanzamiento a clientes reales, se ejecutará:
1. Rotación completa de la clave Service Role y claves de API en Supabase Dashboard.
2. Eliminación y recreación de los usuarios de prueba en Supabase Auth.
3. Rotación de `EVOLUTION_API_KEY` y `INTERNAL_TOKEN` en Vercel y Docker Compose (`/srv/apps/evolution-api/docker-compose.yml`).
4. Cambio de clave del usuario SSH `julio` en el servidor Linux.
5. Revocación del GitHub PAT actual y configuración de secretos via GitHub Actions Environment Variables.
6. Verificación automatizada con GitHub Secret Scanning y GitGuardian.
