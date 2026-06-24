-- =====================================================
-- MIGRACIÓN PARA GESTIÓN DE CRÉDITOS Y COBRANZA
-- Fecha: 2026-06-24
-- =====================================================

-- 1. Añadir columna para la fecha de promesa de pago a la tabla spa_visits
ALTER TABLE spa_visits 
ADD COLUMN IF NOT EXISTS debt_due_date TIMESTAMPTZ;

-- Índices recomendados si vamos a filtrar masivamente por pendientes en cobranza
CREATE INDEX IF NOT EXISTS idx_spa_visits_payment_status ON spa_visits(payment_status) WHERE payment_status IN ('pendiente', 'parcial');
