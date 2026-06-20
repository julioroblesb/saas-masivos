-- Migración: Suscripciones y Facturación para Empresas (Tenants)
-- Añade tipo de plan, fecha de inicio y fin de suscripción a la tabla de companies.

-- 1. Añadir campos a la tabla 'companies'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'prueba'; 
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_start_at timestamptz DEFAULT now();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end_at timestamptz DEFAULT (now() + interval '3 days');

-- 2. Asegurarnos que todos los existentes tengan una fecha válida si eran nulos
UPDATE companies 
SET 
  subscription_start_at = created_at,
  subscription_end_at = created_at + interval '1 year' -- Los tenants existentes tendrán 1 año de gracia por defecto, el admin puede ajustarlos.
WHERE subscription_end_at IS NULL;

-- 3. Restringir actualizaciones a los administradores
-- (Ya teníamos RLS configurada. Asegurarnos que un tenant no pueda actualizar 'subscription_end_at')
-- Esto se maneja automáticamente si las actualizaciones a 'companies' se hacen solo desde el panel Admin usando Service Role Key.
-- O bien, creamos una política específica si fuera necesario (opcional).

-- Refrescar la caché de schema de PostgREST
NOTIFY pgrst, 'reload schema';
