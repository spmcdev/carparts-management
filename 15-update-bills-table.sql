-- Update bills table structure for improved billing functionality
-- 1. Remove UNIQUE constraint from bill_number to allow duplicates/optional values
-- 2. Make bill_number nullable for optional user input
-- 3. Add customer_phone column if it doesn't exist

-- First, drop the unique constraint on bill_number
DO $$ 
BEGIN
    -- Check if the unique constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'bills' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%bill_number%'
    ) THEN
        ALTER TABLE bills DROP CONSTRAINT bills_bill_number_key;
    END IF;
END $$;

-- Make bill_number nullable (allow optional input)
ALTER TABLE bills ALTER COLUMN bill_number DROP NOT NULL;

-- Add customer_phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE bills ADD COLUMN customer_phone VARCHAR(20);
    END IF;
END $$;

-- Add index for better performance on bill_number search (even though it's not unique)
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_customer_name ON bills(customer_name);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);

SELECT 'Bills table updated successfully for flexible billing!' as status;
