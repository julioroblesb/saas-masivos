-- Agregar tracking de respuestas a las campañas
alter table crm_wa_campaigns
add column replied_count int default 0;

-- Agregar tracking individual de mensaje en cola
alter table crm_wa_queue
add column replied boolean default false;

-- Índice para búsquedas rápidas en webhooks
-- Queremos buscar rápidamente por `company_id` y `phone` ordenado por `sent_at` descendente
create index if not exists crm_wa_queue_company_phone_sent_idx on crm_wa_queue (company_id, phone, sent_at desc);
