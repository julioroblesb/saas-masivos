# Línea Base e Inventario Técnico del Sistema (Etapa 01 - Cierre de Observaciones Bloqueantes)

Este directorio contiene la caracterización integral, el inventario técnico real y la matriz de evidencias del sistema extraídos directamente del proyecto Supabase en vivo (**Ref:** `ywpafptrcvgoyaoqgzkz`), la suite de pruebas unitarias Vitest (7 pruebas reales pasadas con Exit Code 0) y la infraestructura del servidor Linux (`servidor-julio`).

---

## Índices de Documentación y Evidencias Entregadas

1. [Inventario del Repositorio](repository-inventory.md)
2. [Rutas de la Aplicación y Superficie HTTP](application-routes.md)
3. [Mapa de Arquitectura del Sistema](architecture.md)
4. [Mapa de Dominios y Responsabilidades](domain-map.md)
5. [Variables de Entorno y Configuración](environment-variables.md)
6. [Inventario del Esquema de Supabase (Base Real)](supabase-schema.md)
7. [Auditoría de Seguridad y RLS en Supabase (Base Real)](supabase-security.md)
8. [Integraciones Externas (Evolution API v2.3.7, Cloudflare, Storage)](integrations.md)
9. [Flujos Críticos y Sistema de Colas](critical-flows.md)
10. [Registro de Deuda Técnica](technical-debt.md)
11. [Métricas de Línea Base](baseline-metrics.md)
12. [Matriz de Pruebas y Caracterización](test-matrix.md)
13. [Candidatos de Eliminación y Código Legacy](deletion-candidates.md)
14. [Registro de Rotación de Credenciales](../credential-rotation-register.md)

---

## Estado de Comandos de Verificación

- **`npm ci`**: exit code 0 (Instalación limpia en 77.05s).
- **`npx tsc`**: exit code 0 (Verificación de tipos en 23.91s).
- **`npm run test:characterization`**: exit code 0 (7/7 pruebas reales pasadas).
- **`npm run build`**: exit code 0 (Compilado en 53.39s).
- **`ESLint`**: exit code 1 por errores heredados de calidad de código, principalmente no-explicit-any, set-state-in-effect, no-require-imports, ban-ts-comment y variables no utilizadas. La corrección queda programada para la Etapa 02.

---

## Evidencias Reproducibles Versionadas en Git

- **Consulta SQL Oficial de Exportación de Funciones**: `docs/refactor/01-baseline/evidence/supabase/sql/06_functions_export.sql`.
- **CSVs de Base de Datos Real**: `docs/refactor/01-baseline/evidence/supabase/` (`tables.csv`, `columns.csv`, `constraints.csv`, `foreign-keys.csv`, `indexes.csv`, `functions.csv`, `function-grants.csv`, `views.csv`, `triggers.csv`, `rls-policies.csv`, `grants.csv`, `storage-buckets.csv`, `extensions.csv`, `row-counts.csv`).
- **Resúmenes de Advisors Declarados**:
  - `docs/refactor/01-baseline/evidence/supabase/security-advisors-summary.json` (Resumen manual, no respuesta cruda del advisor).
  - `docs/refactor/01-baseline/evidence/supabase/performance-advisors-summary.json` (Resumen manual, no respuesta cruda del advisor).
- **Auditoría Multi-Tenant RLS**: `docs/refactor/01-baseline/evidence/rls-test-results.json` (19 casos probados registrando desglosadamente los casos ejecutados y no ejecutados).
- **Pruebas de Caracterización Vitest**: `apps/web/vitest.config.mts` y `apps/web/src/domain/characterization.characterization.test.ts` (7/7 pruebas reales pasadas).
- **Logs Versionados en Git**: `docs/refactor/01-baseline/evidence/build/` (`npm-ci.log`, `lint.log`, `typecheck.log`, `test-characterization.log`, `build.log`, `timings.json`).
