# Línea Base e Inventario Técnico del Sistema (Etapa 01 - Corregido)

Este directorio contiene la caracterización integral, el inventario técnico real y la matriz de evidencias del sistema extraídos directamente del proyecto Supabase en vivo (**Ref:** `ywpafptrcvgoyaoqgzkz`) y del servidor Linux doméstico (`servidor-julio`).

> **Nota de Corrección de Desviación**: El inventario inicial fue inferido desde migraciones locales. En esta versión corregida, fue sustituido al 100% por una extracción reproducible contra la base de datos PostgreSQL desplegada en vivo.

---

## Índice de Documentación

1. [Inventario del Repositorio](repository-inventory.md)
2. [Rutas de la Aplicación y Superficie HTTP](application-routes.md)
3. [Mapa de Arquitectura del Sistema](architecture.md)
4. [Mapa de Dominios y Responsabilidades](domain-map.md)
5. [Variables de Entorno y Configuración](environment-variables.md)
6. [Inventario del Esquema de Supabase (Base Real)](supabase-schema.md)
7. [Auditoría de Seguridad y RLS en Supabase (Base Real)](supabase-security.md)
8. [Integraciones Externas (Evolution API, Cloudflare, Storage)](integrations.md)
9. [Flujos Críticos y Sistema de Colas](critical-flows.md)
10. [Registro de Deuda Técnica](technical-debt.md)
11. [Métricas de Línea Base](baseline-metrics.md)
12. [Matriz de Pruebas y Caracterización](test-matrix.md)
13. [Candidatos de Eliminación y Código Legacy](deletion-candidates.md)

---

## Diferencias Clave entre Migraciones Locales y Base Real Desplegada

| Componente | Migraciones Locales | Base Real (`ywpafptrcvgoyaoqgzkz`) | Explicación / Impacto |
| :--- | :---: | :---: | :--- |
| **Tablas Públicas** | 15 | **16** | Incluye la tabla `spa_products` (91 filas) omitida en el inventario inicial. |
| **Vistas Públicas** | `v_active_tenants` | **`view_crm_profiles`** (1,120 filas) | La vista real es `view_crm_profiles`. `v_active_tenants` no existe en la base desplegada. |
| **Storage Bucket** | `campaign-media` | **`spa-media`** (Público) | El bucket real activo para la app es `spa-media`. |
| **Registros Reales** | 0 - 12 de prueba | **3,187 visitas / 1,120 contactos** | Volumen real del sistema en producción. |

---

## Evidencias Reproducibles de Supabase

Las 15 consultas SQL ejecutables y sus CSVs correspondientes se encuentran en:
- `docs/refactor/01-baseline/evidence/supabase/sql/` (`01_tables.sql` a `15_advisors-reference.md`)
- `docs/refactor/01-baseline/evidence/supabase/` (`tables.csv`, `columns.csv`, `constraints.csv`, `foreign-keys.csv`, `indexes.csv`, `functions.csv`, `function-grants.csv`, `views.csv`, `triggers.csv`, `rls-policies.csv`, `grants.csv`, `storage-buckets.csv`, `extensions.csv`, `row-counts.csv`).
- `docs/refactor/01-baseline/evidence/rls-test-results.json` (Resultado atómico de 15 pruebas RLS con Tenant A y Tenant B).
- `docs/refactor/01-baseline/evidence/server-metrics.txt` (Métricas de hardware y contenedores del servidor real).
- `docs/refactor/01-baseline/evidence/build/` (`npm-ci.log`, `lint.log`, `typecheck.log`, `test-characterization.log`, `build.log`, `timings.json`).
