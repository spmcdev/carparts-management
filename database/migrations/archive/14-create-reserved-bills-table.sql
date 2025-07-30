-- Create reserved_bills table for reservation functionality
CREATE TABLE IF NOT EXISTS reserved_bills (
    id SERIAL PRIMARY KEY,
    reservation_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    part_id INTEGER NOT NULL,
    price_agreed DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (price_agreed - deposit_amount) STORED,
    status VARCHAR(50) DEFAULT 'reserved',
    reserved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    completed_by INTEGER,
    created_by INTEGER,
    notes TEXT,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reserved_bills_reservation_number ON reserved_bills(reservation_number);
CREATE INDEX IF NOT EXISTS idx_reserved_bills_customer_phone ON reserved_bills(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reserved_bills_status ON reserved_bills(status);
CREATE INDEX IF NOT EXISTS idx_reserved_bills_part_id ON reserved_bills(part_id);

-- Add reservation status to parts table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parts' AND column_name = 'reservation_id'
    ) THEN
        ALTER TABLE parts ADD COLUMN reservation_id INTEGER;
        ALTER TABLE parts ADD CONSTRAINT fk_parts_reservation 
            FOREIGN KEY (reservation_id) REFERENCES reserved_bills(id);
    END IF;
END $$;

SELECT 'Reserved bills table created successfully!' as status;
