-- Fase 1: Crear tabla de configuración del negocio
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Crear tabla business_settings (singleton pattern)
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Días de operación (array de números: 0=Domingo, 1=Lunes, ..., 6=Sábado)
  operating_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}' NOT NULL,

  -- Horarios (formato 24h: "21:00", "01:00")
  opening_time TEXT DEFAULT '21:00' NOT NULL,
  closing_time TEXT DEFAULT '01:00' NOT NULL,

  -- Control manual de pausas
  is_paused BOOLEAN DEFAULT FALSE NOT NULL,
  pause_message TEXT DEFAULT 'Estamos cerrados temporalmente. Volvemos pronto!',

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_opening_time CHECK (opening_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT valid_closing_time CHECK (closing_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT valid_operating_days CHECK (
    operating_days <@ ARRAY[0,1,2,3,4,5,6] AND
    array_length(operating_days, 1) > 0
  )
);

-- 2. Insertar configuración por defecto (singleton - ID fijo)
INSERT INTO business_settings (
  id,
  operating_days,
  opening_time,
  closing_time,
  is_paused,
  pause_message
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{0,1,2,3,4,5,6}', -- Todos los días
  '21:00',           -- Apertura 21:00
  '01:00',           -- Cierre 01:00
  FALSE,
  'Estamos cerrados temporalmente. Volvemos pronto!'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para updated_at
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Comentarios
COMMENT ON TABLE business_settings IS 'Configuración del negocio (singleton)';
COMMENT ON COLUMN business_settings.operating_days IS 'Días activos: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab';
COMMENT ON COLUMN business_settings.opening_time IS 'Hora de apertura en formato 24h (HH:MM)';
COMMENT ON COLUMN business_settings.closing_time IS 'Hora de cierre en formato 24h (HH:MM)';
COMMENT ON COLUMN business_settings.is_paused IS 'Pausa manual para cerrar temporalmente';
