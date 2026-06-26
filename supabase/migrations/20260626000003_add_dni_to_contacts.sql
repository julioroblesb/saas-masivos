-- =====================================================
-- MIGRACIÓN DE DNI EN CONTACTOS
-- Fecha: 2026-06-26
-- =====================================================

ALTER TABLE crm_marketing_contacts 
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(20);

-- Si se requiere añadir el document_number al índice de búsqueda, 
-- se puede usar el name, phone y document_number para facilitar el buscador en el futuro.
