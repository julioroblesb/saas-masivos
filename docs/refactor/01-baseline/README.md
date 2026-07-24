# Línea Base e Inventario Técnico del Sistema (Etapa 01)

Este directorio contiene la caracterización integral, el inventario técnico y la matriz de evidencias del sistema previo al inicio de las etapas de refactorización.

---

## Índice de Documentación

1. [Inventario del Repositorio](repository-inventory.md)
2. [Rutas de la Aplicación y Superficie HTTP](application-routes.md)
3. [Mapa de Arquitectura del Sistema](architecture.md)
4. [Mapa de Dominios y Responsabilidades](domain-map.md)
5. [Variables de Entorno y Configuración](environment-variables.md)
6. [Inventario del Esquema de Supabase](supabase-schema.md)
7. [Auditoría de Seguridad y RLS en Supabase](supabase-security.md)
8. [Integraciones Externas (Evolution API, Cloudflare, Storage)](integrations.md)
9. [Flujos Críticos y Sistema de Colas](critical-flows.md)
10. [Registro de Deuda Técnica](technical-debt.md)
11. [Métricas de Línea Base](baseline-metrics.md)
12. [Matriz de Pruebas y Caracterización](test-matrix.md)
13. [Candidatos de Eliminación y Código Legacy](deletion-candidates.md)

---

## Cómo Reproducir todos los Diagnósticos

### 1. Inventario del Repositorio y Dependencias
```bash
# Árbol completo sanitizado
python -c "import os; ignore={'.git','.next','node_modules','coverage'}; print('\n'.join(sorted([os.path.relpath(os.path.join(r,f),'.').replace('\\\\','/') for r,d,fs in os.walk('.') if not any(x in r for x in ignore) for f in fs])))" > docs/refactor/01-baseline/evidence/repository-files.txt

# Diagnóstico de dependencias npm
npm ls --all > docs/refactor/01-baseline/evidence/npm-ls-all.txt 2>&1
npm outdated > docs/refactor/01-baseline/evidence/npm-outdated.txt 2>&1
npm audit --json > docs/refactor/01-baseline/evidence/npm-audit.json
```

### 2. Métricas del Código Fuente
```bash
# Conteo de Any
grep -RIn '\bany\b' apps/web/src --include='*.ts' --include='*.tsx' > docs/refactor/01-baseline/evidence/any-usages.txt

# Conteo de Console
grep -RIn 'console\.' apps/web/src --include='*.ts' --include='*.tsx' > docs/refactor/01-baseline/evidence/console-usages.txt

# Creaciones de Cliente Supabase
grep -RIn 'createClient(' apps/web/src --include='*.ts' --include='*.tsx' > docs/refactor/01-baseline/evidence/supabase-client-creations.txt
```

---

## Resumen Ejecutivo de Diagnóstico (20 Puntos Críticos)

1. **Inconsistencia de Workspaces**: El archivo `package.json` raíz declara `workspaces: ["apps/*"]`, pero contiene una referencia `extraneous` en `package-lock.json` a `apps/wa-service` (módulo eliminado previamente).
2. **Deficiencia de Scripts de Calidad**: El repositorio solo declara `dev`, `build`, `start` y `lint`. No posee runner de pruebas unitarias o de integración.
3. **Puntajes de Deuda en Tipado**: Se registraron **166 usos explícitos de `any`** en el código fuente de `apps/web`.
4. **Dispersión de Clientes Supabase**: Se cuentan **66 instancias/llamadas directas** a `createClient` o `getSupabaseAdmin` distribuidas entre componentes, Server Actions y API Routes sin patrón singleton.
5. **Variables de Entorno OpcionalesInseguras**: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` figuran como opcionales en esquemas locales pero son requeridas en runtime.
6. **Monolito de Proceso de Cola**: La API route `/api/cron/process-queue` concentra 286 líneas mezclando autenticación de cron, watchdog, selección de sesiones, sleep/jitter, invocación HTTP y contadores.
7. **Riesgo de Timeout en Serverless**: El cron efectúa pausas activas (`setTimeout`) de hasta 45s por empresa dentro de funciones de Vercel.
8. **Reclamación de Cola**: La reclamación se realiza mediante `UPDATE` condicional (`status = 'pendiente'`), reduciendo duplicados pero careciendo de leases, backoff exponencial estructurado o Dead-Letter Queue (DLQ).
9. **Campos Legacy en BD**: Las columnas `wa_sessions.bb_project_id` y `wa_sessions.bb_host` permanecen activas en BD produciendo ambigüedad tras migrar de BuilderBot a Evolution API.
10. **Tabla Legacy Huérfana**: Existe la tabla `wa_auth_state` en el esquema público de Supabase sin lecturas ni escrituras en el código actual.
11. **Vistas SECURITY DEFINER**: Se detectaron vistas con permisos elevados que omiten aislamiento explícito por `company_id`.
12. **Funciones RPC sin `search_path` Fijo**: Múltiples funciones SQL declaradas con `SECURITY DEFINER` no fuerzan `SET search_path = public`, exponiendo riesgos de hijacking de esquema.
13. **Políticas RLS en `public`**: Múltiples tablas públicas tienen políticas asignadas al rol `public` en lugar de restringirse a `authenticated`.
14. **Bucket de Storage Público**: El bucket `campaign-media` permite listado de archivos públicamente sin restricción estricta de tenant por carpeta.
15. **Sobrecargas de Funciones RPC**: Existen versiones obsoletas de `rpc_create_campaign` y `search_contacts` que conviven con versiones actualizadas en el esquema SQL.
16. **Inconsistencia de Estados Administrativos**: Convivencia de valores `'active'` y `'activa'` corregida gradualmente, pero requiriendo restricción `CHECK` rígida en base de datos.
17. **Falta de Idempotencia en Webhooks**: El webhook `/api/wa/webhook` procesa respuestas sin guardar un registro previo de `external_event_id` contra duplicados.
18. **Contratos any en Evolution Client**: `src/integrations/evolution/client.ts` utiliza firmas desacopladas de modelos DTO estrictos.
19. **Ausencia de Transacciones en Operaciones Multitabla**: La eliminación de contactos e historial combina Server Actions y RPCs independientes sin una sola transacción atómica.
20. **Protección contra Contraseñas Filtradas**: Desactivada en la configuración por defecto de Supabase Auth.

---

## Riesgos que Bloquean Producción Real

* **B-01**: Invocaciones HTTP con `SUPABASE_SERVICE_ROLE_KEY` fuera de RLS que aceptan parámetros enviados directamente desde el cliente sin validación estricta de pertenencia al `company_id`.
* **B-02**: Funciones RPC `SECURITY DEFINER` ejecutables por rol `anon`.
* **B-03**: Proceso de cola cron propenso a cancelación brusca por Vercel Serverless Function timeouts (45s max duration).

---

## Áreas que Pueden Conservarse

* **Frontend UI Layout & Components**: La estructura visual construida sobre Next.js App Router, TailwindCSS y Lucide React es moderna, responsive y estéticamente sólida.
* **Cliente Modular Evolution**: `src/integrations/evolution/client.ts` constituye una excelente abstracción centralizada para la API v2.2.3.
* **Lógica de Acceso `evaluateTenantAccess`**: La lógica centralizada en `src/domain/subscriptions/evaluate-tenant-access.ts` calcula correctamente el acceso efectivo.

---

## Orden Recomendado para las Siguientes Etapas

1. **Etapa 02**: Limpieza de Tooling, Workspaces y Contención de Seguridad en BD.
2. **Etapa 03**: Módulo Único de Configuración y Clientes Supabase Singleton.
3. **Etapa 04**: Redefinición del Modelo de Datos de WhatsApp e Idempotencia de Webhooks.
4. **Etapa 05**: Desacoplamiento del Procesador de Colas (Worker Dedicado).
5. **Etapa 06**: Endurecimiento RLS, RPC Transaccionales y Pruebas E2E.
