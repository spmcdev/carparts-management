-- Migration: Add container_no field to parts table
-- Run this in Railway PostgreSQL console to add the new field

ALTER TABLE parts ADD COLUMN IF NOT EXISTS container_no VARCHAR(255);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_parts_container_no ON parts(container_no);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'parts' AND column_name = 'container_no';

SELECT 'Container No field added successfully!' as status;
