# Candidatos de Eliminación y Código Legacy

Este documento registra los componentes, configuraciones y artefactos que han sido identificados como obsoletos o candidatos a retiro en etapas futuras autorizadas. **Ningún elemento listado a continuación ha sido eliminado en la Etapa 01.**

---

## Matriz de Candidatos a Retiro

| Candidato                                  | Ubicación / Referencia    | Evidencia de Obsolescencia                                                                                                                      | Riesgo de Eliminación      | Etapa Propuesta para Retiro |
| :----------------------------------------- | :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- | :-------------------------: |
| **Workspace Extraneous `apps/wa-service`** | `package-lock.json`       | El directorio `apps/wa-service` no existe en el sistema de archivos; la referencia en lockfile es residual de un microservicio Render anterior. | Bajo                       |          Etapa 02           |
| **Tabla `wa_auth_state`**                  | Supabase DB Schema        | Tabla creada para almacenamiento multi-file de Baileys nativo. Actualmente inactiva al delegar la gestión a Evolution API.                      | Bajo (requiere backup)     |          Etapa 04           |
| **Columna `wa_sessions.bb_host`**          | Supabase DB `wa_sessions` | Campo originado en BuilderBot Cloud que ya no se lee ni escribe en la arquitectura de Evolution API.                                            | Bajo                       |          Etapa 04           |
| **Sobrecargas Obsoletas de RPC**           | Supabase DB Functions     | Versiones antiguas de `rpc_create_campaign` y `search_contacts` desplazadas por versiones más recientes.                                        | Medio (requiere auditoría) |          Etapa 02           |
| **Vista `v_active_tenants`**               | Supabase DB Views         | Vista `SECURITY DEFINER` redundante reemplazada por la lógica centralizada de suscripciones en backend.                                         | Bajo                       |          Etapa 02           |
