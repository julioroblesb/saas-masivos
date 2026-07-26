# Etapa 03 — Supabase como fuente única de verdad

## Estructura canónica

La única fuente estructural es `supabase/migrations/`, ordenada por versión.
Se eliminaron `schema.sql` y `all_migrations.sql` porque eran copias manuales
divergentes. La migración `20260619000000_init_schema.sql` es el baseline y el
resto representa cambios incrementales.

También se consolidaron las dos migraciones que compartían la versión
`20260619000001`; Supabase exige una versión única por archivo.

## Artefactos versionados

- `supabase/config.toml`: configuración local oficial, PostgreSQL 17.
- `supabase/seed.sql`: datos deterministas sin información real.
- `apps/web/src/types/database.generated.ts`: tipos generados desde producción.
- `supabase/snapshots/production-catalog.json`: 172 huellas del catálogo vivo.
- `supabase/scripts/catalog_fingerprint.sql`: consulta reproducible de drift.

Las huellas cubren tablas, constraints, índices, funciones, políticas, vistas y
triggers sin guardar filas, credenciales ni cuerpos SQL en el snapshot.

## Flujo de cambios

```bash
supabase migration new nombre_del_cambio
supabase db reset
supabase db lint
supabase gen types typescript --local > apps/web/src/types/database.generated.ts
npm run typecheck
```

No se permiten cambios estructurales manuales desde Dashboard. Todo cambio debe
existir primero como migración, probarse en una base vacía y después aplicarse al
entorno remoto.

## Aplicación y rollback

Antes de aplicar una migración:

1. generar un backup verificable;
2. ejecutar `supabase db reset` en local o en una rama temporal;
3. revisar `supabase db diff` y la huella del catálogo;
4. aplicar con `supabase db push` o mediante el pipeline;
5. regenerar tipos y snapshot.

Cada migración destructiva debe incluir en su encabezado:

- consulta previa de impacto;
- estrategia de backfill;
- SQL de rollback compatible;
- condiciones que obligan a abortar.

Los cambios no destructivos se revierten con una migración compensatoria. Nunca
se edita ni se borra una migración que ya haya sido aplicada a un entorno.

## Validación sin costo

No se crearán ramas ni recursos facturables. Como este equipo no dispone de
Docker, la cadena se valida en un esquema temporal dentro de una transacción que
termina siempre con `ROLLBACK`. Esto permite detectar errores de orden, objetos
duplicados y dependencias ausentes sin persistir estructura ni modificar filas.

La reconstrucción transaccional detectó y corrigió:

- cuatro tablas ausentes de las migraciones;
- siete columnas existentes solo en producción;
- una RPC sin definición versionada;
- cuatro cambios de retorno de RPC sin `DROP FUNCTION`;
- una política RLS creada dos veces;
- una columna usada antes de ser creada.

Resultado final:

```text
32 archivos de migración
0 versiones duplicadas
16/16 tablas reconstruidas
172/172 columnas cubiertas
21/21 funciones vigentes cubiertas
ROLLBACK verificado: no quedó el esquema temporal
```

`current_tenant_id()` se excluye de la cobertura porque es un objeto legacy roto:
referencia `public.user_roles`, tabla que no existe. La Etapa 04 lo elimina de
producción y del snapshot.
