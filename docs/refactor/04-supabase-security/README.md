# Etapa 04 — Seguridad de Supabase

## Resultado

La superficie pública de Supabase quedó limitada a usuarios autenticados y
cada operación privilegiada deriva el tenant desde `auth.uid()`. La migración
se ensayó dentro de una transacción con `ROLLBACK` antes de aplicarse.

## Cambios principales

- La vista CRM usa `security_invoker`.
- Se eliminaron RPC heredadas con `company_id` o `created_by` controlados por
  el cliente.
- Todas las políticas `public` pasaron a `authenticated`.
- Las políticas de actualización incluyen `WITH CHECK`.
- Las RPC administrativas de demos y contadores de campaña quedaron
  restringidas a `service_role`.
- Las funciones expuestas fijan `search_path`.
- El acceso a Storage exige autenticación y una carpeta cuyo primer segmento
  coincide con el tenant.
- Se eliminaron índices duplicados y se añadieron índices para claves foráneas.
- Se retiraron rutas de depuración y el cliente administrativo falla de forma
  segura si faltan variables de entorno.

## Evidencia

- Políticas públicas después de la migración: `0`.
- Políticas autenticadas: `39`.
- Pruebas remotas con dos tenants:
  - Tenant A no lee empresa ni contactos de Tenant B.
  - Tenant A no actualiza ni elimina contactos de Tenant B.
  - Las RPC protegidas rechazan IDs de Tenant B.
  - `anon` no lee empresas ni contactos.
  - Los contadores internos solo son ejecutables por `service_role`.
- El SQL reproducible está en
  `supabase/tests/tenant_isolation.sql`.

## Advertencias restantes

El advisor puede conservar temporalmente resultados previos en caché. Las
advertencias sobre RPC `SECURITY DEFINER` autenticadas son intencionales: esas
RPC implementan escrituras acotadas al tenant y revocan acceso anónimo. La
protección contra contraseñas filtradas es una configuración de Supabase Auth,
no una migración SQL, y debe habilitarse en la configuración del proyecto.

## Rollback

El rollback de aplicación consiste en revertir el commit de esta etapa. Para
base de datos debe prepararse una migración compensatoria; no se debe editar el
dashboard manualmente. Los cambios aplicados no transformaron ni eliminaron
filas de negocio.
