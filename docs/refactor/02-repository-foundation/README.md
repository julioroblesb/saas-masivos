# Etapa 02 — Base del repositorio

## Resultado

La aplicación dispone de una base reproducible para desarrollo y CI:

- npm 10.9.2 como único gestor, declarado en `packageManager`;
- Node.js 20.19 o superior;
- workspace único `apps/web`, sin la referencia fantasma a `apps/wa-service`;
- scripts raíz para formato, lint, tipos, pruebas y build;
- Prettier y ESLint configurados;
- pipeline de GitHub Actions;
- plantilla de variables de entorno sin secretos;
- documentación raíz y ADR de la decisión del gestor de paquetes.

## Seguridad de dependencias

Se actualizó Next.js de 16.2.9 a 16.2.12 y se eliminó `shadcn` del runtime porque
solo era una herramienta de generación y no estaba importada por la aplicación.
El lockfile fuerza versiones corregidas de las dependencias transitivas afectadas.

Validación:

```text
npm audit: 0 vulnerabilidades
npm audit --omit=dev: 0 vulnerabilidades
```

## Gates verificados

```text
Prettier: correcto
ESLint: 0 errores
TypeScript: correcto
Vitest: 7/7 pruebas
Next.js build: correcto
```

La deuda heredada de reglas React Compiler y tipos `any` permanece visible como
advertencias. Se corrige en las etapas de backend y frontend, sin desactivar las
reglas.

## Comandos

```bash
npm ci
npm run check
npm run format:check
```

## Control externo pendiente

La protección final de `main` se activa cuando el pipeline y el despliegue estén
publicados, para exigir los checks validados sin bloquear la integración inicial.
