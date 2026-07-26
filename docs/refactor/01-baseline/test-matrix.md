# Matriz de Pruebas y Caracterización

## 1. Pruebas Unitarias de Caracterización Real (Runner: Vitest)

Configuración en `apps/web/vitest.config.mts` y suite en `apps/web/src/domain/characterization.characterization.test.ts`.

- **Tests Reales Actuales de Código Productivo**: **7**
- **Tests Reales Pasados**: **7 (100%)**
- **Casos No Automatizables sin Refactorización**: **5**

| ID           | Función Importada      | Comportamiento Verificado                       |   Tipo   |  Estado  | Resultado / Evidencia                         |
| :----------- | :--------------------- | :---------------------------------------------- | :------: | :------: | :-------------------------------------------- |
| **UNIT-001** | `evaluateTenantAccess` | Concede acceso a tenant activo con fecha futura | Unitaria | **PASS** | Retorna `allowed: true, reason: 'active'`     |
| **UNIT-002** | `evaluateTenantAccess` | Deniega acceso a tenant con fecha vencida       | Unitaria | **PASS** | Retorna `allowed: false, reason: 'expired'`   |
| **UNIT-003** | `evaluateTenantAccess` | Deniega acceso a tenant suspendido              | Unitaria | **PASS** | Retorna `allowed: false, reason: 'suspended'` |
| **UNIT-004** | `extractEvolutionQr`   | Extrae QR en base64 de primer nivel             | Unitaria | **PASS** | Retorna string base64                         |
| **UNIT-005** | `extractEvolutionQr`   | Extrae QR en objeto anidado `qrcode.base64`     | Unitaria | **PASS** | Retorna string base64 anidado                 |
| **UNIT-006** | `extractEvolutionQr`   | Retorna null en payload nulo o inválido         | Unitaria | **PASS** | Retorna `null`                                |
| **UNIT-007** | `resolveSpintax`       | Resuelve spintax simple `{Hola\|Buenos dias}`   | Unitaria | **PASS** | Reemplaza aleatoriamente por variante         |

---

## 2. Comportamientos No Automatizables en el Estado Actual (Requieren Refactorización)

| ID             | Área / Lógica                 | Razón de Imposibilidad de Aislamiento                                                                          | Clasificación                          |
| :------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| **NOAUTO-001** | Generación de `instanceName`  | Lógica incrustada dentro del Handler HTTP de la API Route `/api/wa/instance/route.ts` sin exportación modular. | `NO AUTOMATIZABLE SIN REFACTORIZACIÓN` |
| **NOAUTO-002** | Normalización telefónica      | Regex incrustada directamente en Server Actions de contactos sin función auxiliar expuesta.                    | `NO AUTOMATIZABLE SIN REFACTORIZACIÓN` |
| **NOAUTO-003** | Mapeo de estados Evolution    | Transformación de estado `open` a `conectado` dentro de `/api/wa/status/route.ts`.                             | `NO AUTOMATIZABLE SIN REFACTORIZACIÓN` |
| **NOAUTO-004** | Validación de secreto Webhook | Verificación de cabecera `X-Evolution-Webhook-Secret` dentro del handler `/api/wa/webhook/route.ts`.           | `NO AUTOMATIZABLE SIN REFACTORIZACIÓN` |
| **NOAUTO-005** | Procesamiento de cola Cron    | Loop monolítico y llamadas directas a Supabase Service Role Client en `/api/cron/process-queue/route.ts`.      | `NO AUTOMATIZABLE SIN REFACTORIZACIÓN` |

---

## 3. Pruebas de Auditoría de Aislamiento Multi-Tenant (`scripts/audit/test-tenant-isolation.js`)

Consulte la evidencia completa de 19 casos ejecutados en [docs/refactor/01-baseline/evidence/rls-test-results.json](file:///c:/Users/Julio/OneDrive/Desktop/NAVIER/masivos/docs/refactor/01-baseline/evidence/rls-test-results.json).
