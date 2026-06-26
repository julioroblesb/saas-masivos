-- =====================================================
-- MIGRACIÓN DE SISTEMA DE AGENDA, DISPONIBILIDAD Y BLOQUEOS
-- Fecha: 2026-06-26
-- =====================================================

-- 1. Actualizar spa_visits para soportar estado 'agendado' y duración
ALTER TABLE spa_visits 
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Quitar cualquier constraint anterior de status y volver a crearlo
ALTER TABLE spa_visits DROP CONSTRAINT IF EXISTS spa_visits_status_check;
ALTER TABLE spa_visits ADD CONSTRAINT spa_visits_status_check 
  CHECK (status IN ('agendado', 'en_curso', 'completado', 'cancelado'));

-- 2. Crear tabla spa_staff_schedules (Disponibilidad semanal recurrente)
CREATE TABLE IF NOT EXISTS spa_staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES spa_staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, ...
    start_time TIME NOT NULL DEFAULT '09:00:00',
    end_time TIME NOT NULL DEFAULT '18:00:00',
    is_working BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(staff_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_spa_staff_schedules_company ON spa_staff_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_spa_staff_schedules_staff ON spa_staff_schedules(staff_id);

-- 3. Crear tabla spa_staff_blocks (Bloqueos específicos por fecha)
CREATE TABLE IF NOT EXISTS spa_staff_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES spa_staff(id) ON DELETE CASCADE,
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spa_staff_blocks_company ON spa_staff_blocks(company_id);
CREATE INDEX IF NOT EXISTS idx_spa_staff_blocks_staff_date ON spa_staff_blocks(staff_id, block_date);

-- 4. RLS para spa_staff_schedules
ALTER TABLE spa_staff_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spa_staff_schedules_select" ON spa_staff_schedules FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_staff_schedules_insert" ON spa_staff_schedules FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_staff_schedules_update" ON spa_staff_schedules FOR UPDATE USING (company_id = auth_company_id());
CREATE POLICY "spa_staff_schedules_delete" ON spa_staff_schedules FOR DELETE USING (company_id = auth_company_id());

-- 5. RLS para spa_staff_blocks
ALTER TABLE spa_staff_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spa_staff_blocks_select" ON spa_staff_blocks FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_staff_blocks_insert" ON spa_staff_blocks FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_staff_blocks_update" ON spa_staff_blocks FOR UPDATE USING (company_id = auth_company_id());
CREATE POLICY "spa_staff_blocks_delete" ON spa_staff_blocks FOR DELETE USING (company_id = auth_company_id());

-- 6. Función RPC para obtener slots disponibles de un día (Draft/Opcional para cálculo en DB)
-- Devuelve intervalos de 30 minutos disponibles restando bloqueos y citas
-- (Esta lógica compleja también se puede hacer en el cliente, pero es más segura en DB)
-- Nota: Por simplicidad de MVP, calcularemos la disponibilidad en el Frontend usando RLS 
-- y trayendo los schedules, blocks y visits del día.
