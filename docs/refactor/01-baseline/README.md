# Línea Base e Inventario Técnico del Sistema (Etapa 01 - Corregido y Auditado)

Este directorio contiene la caracterización integral, el inventario técnico real y la matriz de evidencias del sistema extraídos directamente del proyecto Supabase en vivo (**Ref:** `ywpafptrcvgoyaoqgzkz`), la suite de pruebas unitarias Vitest (7 pruebas reales pasadas) y la infraestructura del servidor Linux (`servidor-julio`).

> **Declaración de Reconocimiento de Desviaciones**: El inventario inicial fue inferido desde migraciones locales. En esta entrega corregida, fue sustituido al 100% por una extracción reproducible y verificada ejecutada directamente contra la base de datos PostgreSQL desplegada en vivo (`Project ref: ywpafptrcvgoyaoqgzkz`).

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

## Evidencias Reproducibles Versionadas en Git

- **Consultas SQL Reproducibles**: `docs/refactor/01-baseline/evidence/supabase/sql/` (`01_tables.sql` a `15_advisors-reference.md`).
- **CSVs de Base de Datos Real**: `docs/refactor/01-baseline/evidence/supabase/` (`tables.csv`, `columns.csv`, `constraints.csv`, `foreign-keys.csv`, `indexes.csv`, `functions.csv`, `function-grants.csv`, `views.csv`, `triggers.csv`, `rls-policies.csv`, `grants.csv`, `storage-buckets.csv`, `extensions.csv`, `row-counts.csv`).
- **Advisors Crudos y Resúmenes Supabase**:
  - `docs/refactor/01-baseline/evidence/supabase/security-advisors.raw.json`
  - `docs/refactor/01-baseline/evidence/supabase/performance-advisors.raw.json`
  - `docs/refactor/01-baseline/evidence/supabase/security-advisors-summary.json`
  - `docs/refactor/01-baseline/evidence/supabase/performance-advisors-summary.json`
- **Auditoría Multi-Tenant RLS**: `docs/refactor/01-baseline/evidence/rls-test-results.json` (19 casos probados con derivación dinámica de `company_id`).
- **Pruebas de Caracterización Vitest**: `apps/web/vitest.config.mts` y `apps/web/src/domain/characterization.characterization.test.ts` (7/7 pruebas reales de código productivo pasadas).
- **Métricas del Servidor Real**: `docs/refactor/01-baseline/evidence/server-metrics.txt` (`servidor-julio`).
- **Logs Completos de Build y Limpieza en Git**: `docs/refactor/01-baseline/evidence/build/` (`npm-ci.log`, `lint.log`, `typecheck.log`, `test-characterization.log`, `build.log`, `timings.json`).
