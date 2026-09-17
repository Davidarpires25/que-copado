-- Create delivery_zones table for shipping zone management
CREATE TABLE delivery_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  polygon JSONB NOT NULL,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#FF6B00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  free_shipping_threshold INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active zones (for checkout)
CREATE POLICY "Public read active zones" ON delivery_zones
  FOR SELECT USING (is_active = true);

-- Policy: Authenticated users can manage all zones (admin)
CREATE POLICY "Authenticated manage zones" ON delivery_zones
  FOR ALL USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_delivery_zones_is_active ON delivery_zones(is_active);
CREATE INDEX idx_delivery_zones_sort_order ON delivery_zones(sort_order);

-- Add comment to table
COMMENT ON TABLE delivery_zones IS 'Delivery zones with polygon boundaries for shipping cost calculation';
COMMENT ON COLUMN delivery_zones.polygon IS 'GeoJSON Polygon format: {"type": "Polygon", "coordinates": [[[lng, lat], ...]]}';
COMMENT ON COLUMN delivery_zones.shipping_cost IS 'Shipping cost in ARS (Argentine Pesos)';
COMMENT ON COLUMN delivery_zones.free_shipping_threshold IS 'Order amount threshold for free shipping in this zone (NULL = no free shipping)';
