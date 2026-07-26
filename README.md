# Renova CRM

SaaS multi-tenant para gestión de clientes, agenda, servicios, pagos y automatizaciones
de WhatsApp para spas y salones.

## Requisitos

- Node.js 20.19 o superior
- npm 10.9.2
- Un proyecto Supabase
- Una instancia compatible de Evolution API

## Instalación

```bash
npm ci
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` ejecuta la validación principal completa.

## Estructura

```text
apps/web/             Aplicación Next.js
supabase/migrations/  Historial versionado de base de datos
scripts/audit/        Comprobaciones operativas y de aislamiento
docs/adr/             Decisiones arquitectónicas
docs/refactor/        Evidencias y reportes de refactorización
```

## Variables de entorno

Usa `apps/web/.env.example` como contrato. Las variables con prefijo `NEXT_PUBLIC_`
pueden llegar al navegador; las demás son secretos exclusivos del servidor.

## Despliegue

La rama `main` debe desplegarse únicamente después de que CI pase. Las migraciones de
Supabase se aplican desde archivos versionados y se verifican antes del despliegue de la
aplicación.
