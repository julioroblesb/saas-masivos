# Métricas de Línea Base del Sistema

## 1. Métricas del Repositorio de Código (`git ls-files`)

| Métrica | Valor Registrado | Evidencia / Fuente |
| :--- | :---: | :--- |
| **Archivos Versionados Totales (`git ls-files`)** | **896** | `git ls-files` |
| **Archivos Fuente Reales de Aplicación** | **325** | `apps/web/src`, `migrations`, `scripts` |
| - *Frontend TypeScript / TSX* | 292 | `apps/web/src/**/*.ts(x)` |
| - *Migraciones SQL* | 32 | `supabase/migrations/*.sql` |
| - *Scripts* | 1 | `scripts/audit/test-tenant-isolation.js` |
| **Documentación (`docs/`)** | 35 | `docs/` |

---

## 2. Métricas de Supabase (Proyecto en Vivo `ywpafptrcvgoyaoqgzkz`)

| Métrica | Valor Registrado | Evidencia / Fuente |
| :--- | :---: | :--- |
| **Tablas Públicas** | 16 | `tables.csv` (incluye `spa_products`) |
| **Vistas Públicas** | 1 | `views.csv` (`view_crm_profiles`) |
| **Funciones / RPCs** | 25 | `functions.csv` |
| **Funciones SECURITY DEFINER** | 20 | `functions.csv` |
| **Políticas RLS Declaradas** | 38 | `rls-policies.csv` |
| **Buckets de Storage Públicos** | 1 | `storage-buckets.csv` (`spa-media`) |
| **Visitas Agendadas (`spa_visits`)** | 3,187 | `row-counts.csv` |
| **Pagos Registrados (`spa_payments`)** | 2,783 | `row-counts.csv` |
| **Contactos CRM (`crm_marketing_contacts`)** | 1,120 | `row-counts.csv` |

---

## 3. Tiempos y Resultados del Build Limpio en PowerShell (`evidence/build/timings.json`)

| Comando | Duración | Exit Code Real | Estado de Línea Base |
| :--- | :---: | :---: | :--- |
| `npm ci` | 77.05s | **0** | **SUCCESS (Instalación limpia completa)** |
| `npm run lint --workspace=apps/web` | 33.80s | **1** | FAILED (Warnings de deprecación ESLint en motor) |
| `npx tsc --noEmit --project apps/web/tsconfig.json` | 23.91s | **0** | **SUCCESS (Verificación estática de tipos limpia)** |
| `npm run test:characterization --workspace=apps/web` | 3.46s | **0** | **SUCCESS (12/12 Pruebas de Vitest pasan)** |
| `npm run build --workspace=apps/web` | 53.39s | **0** | **SUCCESS (Compilado en 53.39s con npx next build)** |

---

## 4. Métricas de Servidor en Vivo (`servidor-julio` @ `2026-07-24T11:05:59-05:00`)

| Métrica | Valor Medido | Observación |
| :--- | :--- | :--- |
| **Uptime** | `up 1:36, load average: 0.30, 0.26, 0.20` | Servidor Ubuntu 26.04 estable |
| **Memoria RAM** | `3.4Gi total, 822Mi used, 1.9Gi free, 2.6Gi available` | Uso moderado (~24% RAM) |
| **Disco** | `/ 98G (14% used), /srv 787G (1% used)` | Espacio amplio en `/srv` |
| **Temperatura CPU** | `Package id 0: +42.0°C` | Operación fresca y adecuada |
| **Docker `evolution_api`** | `262.8MiB RAM, 0.00% CPU, 27 PIDs` | Contenedor activo y `healthy` |
| **Docker `evolution_postgres`**| `52.82MiB RAM, 0.01% CPU, 10 PIDs` | Contenedor activo y `healthy` |
| **Docker `evolution_redis`** | `13.11MiB RAM, 1.60% CPU, 6 PIDs` | Contenedor activo y `healthy` |
