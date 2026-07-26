# Reporte de etapa 07 — Arquitectura backend y contratos API

## 1. Rama

- Nombre: `refactor/07-backend-contracts`
- Commit inicial: `edf2b77f96c9970bf266f0f37d1045ce687208f4`
- Commit final: se completa al cerrar la etapa
- PR: integración acumulativa pendiente; el propietario solicitó publicar el resultado final en `main`

## 2. Objetivo ejecutado

Se estableció una base de contratos HTTP reutilizable, un único cliente administrativo
server-only, comparación segura de secretos y validación de respuestas externas. La
configuración de empresa dejó de consultar y modificar datos de tenant directamente
desde React.

## 3. Archivos y responsabilidades

- `src/server/http`: errores de aplicación, envelope uniforme, validación JSON Zod y
  propagación de correlation ID.
- `src/server/security/secrets.ts`: validación constante de secretos y extracción de
  bearer tokens.
- `src/utils/supabase/admin.ts`: única fábrica tipada del cliente `service_role`.
- `src/app/api/settings/company/route.ts`: contrato tipado, autorización central,
  lectura acotada al tenant y actualización mediante RPC.
- Rutas cron, demo, webhook y WhatsApp: reutilizan el cliente administrativo y no
  crean clientes privilegiados dispersos.
- Componentes de configuración: consumen el contrato de backend y ya no consultan
  perfiles ni empresas directamente.

## 4. Base de datos

No se creó ni aplicó una migración en esta etapa. La aplicación usa la RPC
`rpc_update_company_settings` incorporada en la migración de identidad de la etapa 06.
Esa migración permanece deliberadamente sin aplicar hasta el despliegue coordinado de
la aplicación compatible.

## 5. Decisiones técnicas

- El `service_role` solo se construye en un módulo con `server-only`.
- Los endpoints nuevos o refactorizados pueden responder con
  `{ ok, data|error, correlationId }` y el header `x-correlation-id`.
- Los errores internos se registran en servidor, pero la respuesta pública no expone
  detalles de Supabase ni del proveedor.
- Los secretos de cron y webhook no se aceptan por query string y se comparan con
  `timingSafeEqual`.
- La adopción de tipos de base de datos es progresiva: el cliente administrativo ya
  es estricto; los clientes SSR/browser se tiparán al corregir los contratos legacy
  restantes en las etapas 08–11.

## 6. Pruebas ejecutadas

```text
next typegen
tsc --noEmit
vitest run src/server/http/api-response.test.ts src/domain/access/tenant-access.test.ts
eslint <archivos modificados>
```

Resultado:

- Generación de tipos: aprobada.
- TypeScript: aprobado, cero errores.
- Pruebas integrales: 21/21 aprobadas, incluida la suite de secretos.
- Build de producción Next.js: aprobado.
- ESLint focalizado: cero errores. Persisten avisos legacy que serán retirados en las
  etapas de Evolution, cola y frontend.

## 7. Seguridad y aislamiento

- No se expuso el `service_role` al cliente.
- La configuración se resuelve usando usuario autenticado, contexto de acceso y
  `companyId` del servidor; el cliente no elige el tenant.
- Solo un dueño con acceso vigente puede modificar configuración.
- No se modificaron RLS ni grants, por lo que se conservan las pruebas de aislamiento
  aprobadas en las etapas 04 y 06.

## 8. Compatibilidad

Se conserva el contenido de configuración y su fusión superficial. Cambia
intencionalmente el contrato HTTP de `/api/settings/company`; todos sus consumidores
del repositorio se actualizaron en el mismo cambio.

## 9. Rollback

Revertir el commit de la etapa restaura las rutas y componentes anteriores. No existe
rollback de base de datos porque esta etapa no modifica el esquema.

## 10. Riesgos pendientes

- El procesador de cola sigue siendo monolítico y conserva tipos legacy; se sustituye
  en la etapa 09.
- El cliente Evolution conserva respuestas `any`; se encapsula en la etapa 08.
- Algunas rutas WhatsApp aún no adoptan el envelope uniforme; se migran junto con el
  adaptador para evitar dos cambios de contrato.
- La migración de roles de la etapa 06 debe aplicarse únicamente junto con el
  despliegue compatible.

## 11. Declaración

Los cambios se limitaron a arquitectura backend, contratos, seguridad de secretos y
sus consumidores directos. No se transformaron datos ni se alteró el esquema.
