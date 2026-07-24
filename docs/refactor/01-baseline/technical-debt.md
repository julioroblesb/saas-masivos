# Registro de Deuda Técnica (Technical Debt Register - Actualizado)

## TD-001 — 20 Funciones `SECURITY DEFINER` sin `search_path` Fijo y Ejecutables por Roles Inadecuados
- **Severidad**: P0
- **Dominio**: Supabase / Seguridad
- **Evidencia**: Registrado en `functions.csv`. 20 funciones `SECURITY DEFINER` (incluyendo `rpc_create_campaign`, `search_contacts`) omiten `SET search_path = public`.
- **Impacto actual**: Riesgo de hijacking de esquema y ejecución no autorizada por usuarios anónimos o clientes desautenticados.
- **Solución propuesta**: Incluir `SET search_path = public` y revocar `EXECUTE` a `anon` en funciones no públicas.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: M

---

## TD-002 — Vista `SECURITY DEFINER` (`view_crm_profiles`)
- **Severidad**: P1
- **Dominio**: Supabase / Seguridad
- **Evidencia**: `views.csv`. La vista `view_crm_profiles` opera con privilegios elevados omitiendo RLS estricto por `company_id`.
- **Impacto actual**: Exposición potencial de perfiles entre tenants.
- **Solución propuesta**: Convertir en vista normal o asegurar aislamiento RLS explícito.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: S

---

## TD-003 — Bucket de Storage Público Listable (`spa-media`)
- **Severidad**: P2
- **Dominio**: Supabase Storage
- **Evidencia**: `storage-buckets.csv`. Bucket `spa-media` es público y permite listado de archivos.
- **Impacto actual**: Posible descubrimiento de archivos cargados por otros tenants.
- **Solución propuesta**: Desactivar listado público y restringir RLS por path `company_id`.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: S

---

## TD-004 — Foreign Keys sin Índices en Base de Datos Desplegada
- **Severidad**: P2
- **Dominio**: Rendimiento de Base de Datos
- **Evidencia**: `crm_wa_queue.campaign_id` y `spa_visits.staff_id` carecen de índices explícitos.
- **Impacto actual**: Consultas JOIN y borrados en cascada degradan rendimiento.
- **Solución propuesta**: Crear índices `CREATE INDEX` para foreign keys no indexadas.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: S

---

## TD-005 — Salida de `npm run lint` y `npm run build` con Exit Code 1
- **Severidad**: P1
- **Dominio**: Calidad y Build
- **Evidencia**: Registrado en `evidence/build/timings.json` y `lint.log`.
- **Impacto actual**: Fallos en automatización de integración continua (CI).
- **Solución propuesta**: Corregir reglas de linter y vincular el binario de Next.js en workspace scripts.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: S
