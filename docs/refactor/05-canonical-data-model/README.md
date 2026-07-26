# Etapa 05 — Modelo de datos canónico

## Resultado

El esquema ahora impide relaciones cruzadas entre tenants en la propia base de
datos y valida los estados y valores económicos usados por la aplicación.

## Cambios

- `phone_normalized` generado, sin alterar el teléfono original.
- Unicidad de teléfono normalizado por tenant.
- `company_id` explícito en `spa_staff_services`.
- Claves foráneas compuestas para contactos, campañas, cola, personal,
  servicios, visitas, pagos y seguimientos.
- Constraints para estados comerciales, campañas, cola, WhatsApp, pagos,
  precios, stock, duraciones y horarios.
- Campos BuilderBot marcados como obsoletos, pero conservados para una retirada
  posterior compatible.
- `wa_auth_state` marcado como legado; permanece intacto aunque actualmente no
  contiene filas.
- Corrección del estado de agenda `agendada` a `agendado`.

## Verificación en producción

Después de aplicar la migración:

| Entidad   | Filas |
| --------- | ----: |
| Empresas  |    18 |
| Perfiles  |    19 |
| Contactos | 1.120 |
| Visitas   | 3.187 |
| Pagos     | 2.783 |

No quedaron teléfonos sin normalizar, relaciones sin tenant ni constraints sin
validar. La migración completa pasó primero dentro de una transacción con
`ROLLBACK`.

La prueba reproducible está en
`supabase/tests/canonical_data_model.sql`.
