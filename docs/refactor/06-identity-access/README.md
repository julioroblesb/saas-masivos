# Etapa 06 — Identidad, roles y acceso

## Modelo

Los roles de aplicación son:

| Rol           | Tenant  | Operación diaria | Configuración | Usuarios | Superadmin |
| ------------- | ------- | ---------------- | ------------- | -------- | ---------- |
| `employee`    | Propio  | Sí               | No            | No       | No         |
| `owner`       | Propio  | Sí               | Sí            | Sí       | No         |
| `super_admin` | Ninguno | No               | Global        | Global   | Sí         |

El antiguo rol `tenant` se migra a `owner`.

## Fuente única de acceso

`TenantAccessService` obtiene un contexto desde
`rpc_get_my_access_context` y evalúa:

- perfil y rol;
- tenant;
- estado administrativo;
- plan demo, prueba o pagado;
- vencimiento;
- zona horaria;
- permisos de configuración, usuarios y WhatsApp.

Los estados suspendido, cancelado y vencido desactivan el acceso técnico. Los
cambios comerciales se aplican junto con la desconexión lógica de WhatsApp
mediante `rpc_set_tenant_subscription`.

## Aprovisionamiento

Supabase Auth se crea primero. Después,
`rpc_provision_tenant_for_user` crea empresa y perfil dueño dentro de una sola
transacción PostgreSQL. Si falla, la aplicación elimina el usuario Auth como
compensación, evitando empresas o perfiles huérfanos.

## Pruebas

- 15 pruebas unitarias totales.
- Matriz SQL para anon, owner, employee, superadmin y service role.
- El empleado conserva acceso operativo y no puede modificar configuración.
- Las RPC de aprovisionamiento y suscripción solo aceptan `service_role`.
- La migración y la matriz se probaron juntas dentro de una transacción con
  `ROLLBACK`.

La migración se mantiene pendiente de aplicación hasta el despliegue de la
aplicación compatible, para no interrumpir el menú de usuarios existentes.
