-- =====================================================
-- MIGRACIÓN DE HORARIOS POR DEFECTO PARA TRABAJADORAS EXISTENTES
-- Fecha: 2026-06-26
-- =====================================================

WITH missing_staff AS (
  SELECT s.id as staff_id, s.company_id
  FROM spa_staff s
  LEFT JOIN spa_staff_schedules sc ON sc.staff_id = s.id
  GROUP BY s.id, s.company_id
  HAVING COUNT(sc.id) = 0
),
days AS (
  SELECT unnest(ARRAY[1,2,3,4,5,6,0]) as day_of_week
)
INSERT INTO spa_staff_schedules (company_id, staff_id, day_of_week, start_time, end_time, is_working)
SELECT 
  ms.company_id,
  ms.staff_id,
  d.day_of_week,
  '09:00:00'::time,
  '18:00:00'::time,
  d.day_of_week >= 1 AND d.day_of_week <= 5
FROM missing_staff ms
CROSS JOIN days d;
