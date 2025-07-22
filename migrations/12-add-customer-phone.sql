-- Add customer_phone column to bills table
-- Migration: Add customer telephone number support

ALTER TABLE bills 
ADD COLUMN customer_phone VARCHAR(20);

-- Create an index for better performance on phone number searches
CREATE INDEX IF NOT EXISTS idx_bills_customer_phone ON bills(customer_phone);

-- Verify the migration
SELECT 'Customer phone column added successfully!' as status;
