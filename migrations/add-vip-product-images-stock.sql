-- Add multiple images and stock management to VIP products
-- Migration: add-vip-product-images-stock

-- Add new columns for multiple images and stock
ALTER TABLE vip_products 
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate existing imageUrl to images array
UPDATE vip_products 
SET images = jsonb_build_array(jsonb_build_object('url', image_url))
WHERE image_url IS NOT NULL AND image_url != '';

-- Add comment
COMMENT ON COLUMN vip_products.images IS 'Array of image objects with url field (max 3 images)';
COMMENT ON COLUMN vip_products.stock IS 'Available stock for this product';
COMMENT ON COLUMN vip_products.is_active IS 'Whether product is active and available for redemption';


