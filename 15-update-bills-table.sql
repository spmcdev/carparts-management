-- Update bills table structure for improved billing functionality
-- 1. Remove UNIQUE constraint from bill_number to allow duplicates/optional values
-- 2. Make bill_number nullable for optional user input
-- 3. Add customer_phone column if it doesn't exist
-- 4. Add refund status tracking

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

-- Add refund status and related fields
DO $$ 
BEGIN
    -- Add status column for bill status (active, refunded, partially_refunded)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' AND column_name = 'status'
    ) THEN
        ALTER TABLE bills ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
    
    -- Add refund date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' AND column_name = 'refund_date'
    ) THEN
        ALTER TABLE bills ADD COLUMN refund_date DATE;
    END IF;
    
    -- Add refund reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' AND column_name = 'refund_reason'
    ) THEN
        ALTER TABLE bills ADD COLUMN refund_reason TEXT;
    END IF;
    
    -- Add refund amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' AND column_name = 'refund_amount'
    ) THEN
        ALTER TABLE bills ADD COLUMN refund_amount DECIMAL(10,2);
    END IF;
    
    -- Add refunded by user id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' AND column_name = 'refunded_by'
    ) THEN
        ALTER TABLE bills ADD COLUMN refunded_by INTEGER;
        -- Add foreign key constraint to users table
        ALTER TABLE bills ADD CONSTRAINT fk_bills_refunded_by 
            FOREIGN KEY (refunded_by) REFERENCES users(id);
    END IF;
END $$;

-- Add index for better performance on bill_number search (even though it's not unique)
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_customer_name ON bills(customer_name);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_refund_date ON bills(refund_date);

SELECT 'Bills table updated successfully for flexible billing with refund tracking!' as status;
