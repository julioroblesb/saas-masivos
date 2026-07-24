# Supabase Security & Performance Advisors Reference

- Generated at UTC: 2026-07-24T11:00:00Z
- Project ref: ywpafptrcvgoyaoqgzkz
- Source: live database

## Hallazgos Registrados:
1. Security Definer View: `view_crm_profiles`
2. Funciones SECURITY DEFINER ejecutables por `anon` (ej. `rpc_create_campaign`, `search_contacts`)
3. Funciones con search_path mutable
4. Políticas RLS asignadas a `public` en lugar de `authenticated`
5. Bucket público `spa-media` listable sin restricción por tenant
6. Foreign keys sin índice: `crm_wa_queue.campaign_id`, `spa_visits.staff_id`
7. Protección contra contraseñas comprometidas desactivada en Auth settings
