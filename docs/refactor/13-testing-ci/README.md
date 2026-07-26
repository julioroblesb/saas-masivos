# Etapa 13: pruebas completas y CI

## Resultado

El repositorio bloquea cambios que no superen análisis estático, compilación,
pruebas de aplicación, reconstrucción real de PostgreSQL, pruebas RLS, lint de
base de datos, validación de migraciones y detección de secretos.

Todo se ejecuta con herramientas locales u open source y con los minutos
incluidos para repositorios públicos de GitHub; no requiere un servicio de
pruebas de pago.

## Cobertura

- Vitest cubre dominio, contratos, cola, proveedor Evolution, webhooks,
  observabilidad y rutas críticas.
- `supabase test db` reconstruye una base vacía y ejecuta pgTAP.
- Los fixtures locales incluyen dos tenants, owner, employee y superadmin.
- pgTAP comprueba el modelo canónico, la matriz de roles, aislamiento RLS y la
  exclusión mutua de leases de la cola.
- El escáner de secretos analiza exclusivamente archivos rastreados y nunca
  imprime el valor encontrado.

## Ejecución local

```bash
npm ci
npm run check
supabase db start
supabase test db
supabase db lint --local --level error
```

La suite de Supabase requiere Docker, únicamente para el entorno local
desechable. GitHub Actions ya incluye el motor necesario.

## Evidencias esperadas

- ESLint: cero errores y cero advertencias.
- TypeScript: cero errores.
- Vitest: todas las pruebas aprobadas.
- Next.js: build de producción aprobado.
- pgTAP: todos los archivos bajo `supabase/tests` aprobados.
- Secret scan: cero hallazgos.

## Rollback

Revertir el commit de esta etapa elimina los jobs y fixtures de CI. Ningún dato
de producción es modificado por estas pruebas.
