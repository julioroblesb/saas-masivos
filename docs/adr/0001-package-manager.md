# ADR 0001: npm como gestor único del monorepo

- Estado: aceptado
- Fecha: 2026-07-26

## Contexto

El repositorio ya utiliza workspaces de npm y mantiene `package-lock.json`. Mezclar npm y
pnpm genera árboles de dependencias distintos y hace que CI deje de ser reproducible.

## Decisión

Se estandariza npm 10.9.2 con Node.js 20.19 o superior. El lockfile se genera únicamente
con npm y CI instala mediante `npm ci`.

## Consecuencias

- Un clon limpio tiene una instalación determinista.
- Las dependencias pertenecen al workspace que las importa.
- Cualquier cambio de dependencias debe incluir `package-lock.json`.
