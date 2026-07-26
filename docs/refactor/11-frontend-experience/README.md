# Etapa 11 — Frontend y experiencia de usuario

## Resultado

- React Query centraliza el estado remoto, la caché, los reintentos y la invalidación.
- La conexión de WhatsApp utiliza una única consulta con polling limitado y se detiene al alcanzar un estado terminal.
- Campañas dejó de calcular en el navegador reglas de suscripción, cupos y ritmos de envío; esas decisiones pertenecen al dominio del servidor.
- Agenda, atenciones, clientes, cobranza, productos, servicios y mensajería usan tipos explícitos y estados de carga, error, vacío y reintento.
- Las bajas visibles conservan el historial mediante cancelación o archivado.
- Se añadieron límites de caché, errores globales, carga del dashboard, enlace para saltar al contenido, soporte para movimiento reducido y nombres accesibles en controles.
- Las imágenes remotas quedan restringidas al bucket público esperado de Supabase.

## Validación

Ejecutado el 26 de julio de 2026:

```text
TypeScript: 0 errores
Vitest: 7 archivos, 36 pruebas aprobadas
Next.js: compilación de producción aprobada, 24 páginas generadas
ESLint: 0 errores
```

Se intentó el recorrido visual contra la compilación local con los navegadores integrados de Codex y Chrome. Ambos bloquearon la URL local antes de que la aplicación recibiera la solicitud (`ERR_BLOCKED_BY_CLIENT`). La compilación fue servida correctamente en el puerto 3000 y el bloqueo pertenece al cliente de automatización, no al servidor. Los recorridos repetibles se incorporan como pruebas automatizadas en la etapa 13.

## Decisiones

- La UI presenta decisiones del servidor y no reimplementa reglas comerciales.
- Las operaciones remotas se revalidan después de mutar para evitar estados locales divergentes.
- Los registros históricos no se eliminan desde la interfaz.
- No se añadió ningún servicio de pago.
