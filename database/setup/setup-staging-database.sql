-- Staging Database Setup Script
-- This creates a complete staging environment with sample data

-- Use staging-specific settings
SET client_min_messages = WARNING;

-- Create staging-specific user (optional, Railway manages this)
-- CREATE USER carparts_staging WITH PASSWORD 'staging_password_here';

-- Run the main database setup
\i setup-database.sql

-- Add staging-specific sample data
INSERT INTO parts (name, manufacturer, part_number, purchase_price, selling_price, stock_quantity, stock_status) 
VALUES 
  ('Staging Test Brake Pad', 'Test Motors', 'STG-BP-001', 25.00, 45.00, 10, 'available'),
  ('Staging Oil Filter', 'Test Filters', 'STG-OF-002', 8.00, 15.00, 25, 'available'),
  ('Staging Spark Plug', 'Test Electric', 'STG-SP-003', 12.00, 22.00, 50, 'available'),
  ('Staging Air Filter', 'Test Air Co', 'STG-AF-004', 15.00, 28.00, 20, 'available'),
  ('Staging Clutch Kit', 'Test Trans', 'STG-CK-005', 150.00, 275.00, 5, 'available')
ON CONFLICT (part_number) DO NOTHING;

-- Create a staging test user
INSERT INTO users (username, password, role) 
VALUES ('staging_user', '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm', 'user')
ON CONFLICT (username) DO NOTHING;

-- Create sample reservations for testing
DO $$
DECLARE
    res_id INTEGER;
BEGIN
    -- Create a test reservation
    INSERT INTO reservations (
        reservation_number, customer_name, customer_phone, 
        total_amount, deposit_amount, status, created_by
    ) VALUES (
        'STG-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0001',
        'Staging Test Customer',
        '+1-555-0123',
        100.00,
        30.00,
        'reserved',
        1
    ) RETURNING id INTO res_id;
    
    -- Add items to the reservation
    INSERT INTO reservation_items (
        reservation_id, part_id, part_name, manufacturer,
        quantity, unit_price, total_price
    ) 
    SELECT 
        res_id, 
        p.id, 
        p.name, 
        p.manufacturer,
        2,
        p.selling_price,
        p.selling_price * 2
    FROM parts p 
    WHERE p.part_number LIKE 'STG-%' 
    LIMIT 2;
END $$;

-- Update reservation total based on items
UPDATE reservations 
SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0) 
    FROM reservation_items 
    WHERE reservation_id = reservations.id
)
WHERE reservation_number LIKE 'STG-%';

-- Verify staging data
SELECT 'Staging database setup completed!' as status;
SELECT 'Parts available for testing:' as info, COUNT(*) as count FROM parts WHERE part_number LIKE 'STG-%';
SELECT 'Users created:' as info, COUNT(*) as count FROM users;
SELECT 'Test reservations:' as info, COUNT(*) as count FROM reservations WHERE reservation_number LIKE 'STG-%';
