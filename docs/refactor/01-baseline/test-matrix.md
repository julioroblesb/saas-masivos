# Matriz de Pruebas y Caracterización

## 1. Pruebas Unitarias de Caracterización (Runner: Vitest)

Comando de ejecución: `npm run test:characterization --workspace=apps/web` (Configuración en `apps/web/vitest.config.mts` y suite en `apps/web/src/domain/characterization.characterization.test.ts`).

| ID | Función Importable | Comportamiento Probado | Tipo de Prueba | Estado | Resultado / Evidencia |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **UNIT-001** | `evaluateTenantAccess` | Acceso a tenant activo con fecha futura | Unitaria | PASS | Retorna `allowed: true, reason: 'active'` |
| **UNIT-002** | `evaluateTenantAccess` | Denegación a tenant vencido | Unitaria | PASS | Retorna `allowed: false, reason: 'expired'` |
| **UNIT-003** | `evaluateTenantAccess` | Denegación a tenant suspendido | Unitaria | PASS | Retorna `allowed: false, reason: 'suspended'` |
| **UNIT-004** | `extractEvolutionQr` | Extracción de QR en base64 de primer nivel | Unitaria | PASS | Retorna string base64 |
| **UNIT-005** | `extractEvolutionQr` | Extracción de QR en objeto anidado `qrcode` | Unitaria | PASS | Retorna string base64 anidado |
| **UNIT-006** | `extractEvolutionQr` | Retorno null en payload inválido/nulo | Unitaria | PASS | Retorna `null` |
| **UNIT-007** | `resolveSpintax` | Resolución de spintax `{Hola|Buenos dias}` | Unitaria | PASS | Reemplaza aleatoriamente por variante |
| **UNIT-008** | Lógica `instanceName` | Formateo inmutable `company_<uuid_sin_guiones>` | Unitaria | PASS | Retorna `company_3c3cb849...` |
| **UNIT-009** | Normalización teléfono | Limpieza regex y código de país 51 | Unitaria | PASS | Retorna `51987654321` |
| **UNIT-010** | Mapeo estados Evolution| Mapeo de `open` a `conectado` | Unitaria | PASS | Retorna `conectado` |
| **UNIT-011** | Validación Webhook | Verificación de igualdad de token Bearer | Unitaria | PASS | Compara token correctamente |
| **INTEG-001**| Procesamiento de cola | Reclamación atómica e iteración de cola | Integración | `NO AUTOMATIZABLE EN ESTADO ACTUAL` | Acoplamiento directo con Supabase Service Role Client y Vercel Cron handler en `/api/cron/process-queue`. |

---

## 2. Pruebas de Auditoría de Aislamiento Multi-Tenant (`scripts/audit/test-tenant-isolation.mjs`)

Consulte la evidencia completa en `docs/refactor/01-baseline/evidence/rls-test-results.json`.
