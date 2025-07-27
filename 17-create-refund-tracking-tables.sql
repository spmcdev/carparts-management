-- Create detailed refund tracking tables for partial refunds
-- This migration creates two tables:
-- 1. bill_refunds: Main refund records
-- 2. bill_refund_items: Individual items refunded in each refund transaction

-- Create bill_refunds table to track individual refund transactions
CREATE TABLE IF NOT EXISTS bill_refunds (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    refund_type VARCHAR(20) NOT NULL CHECK (refund_type IN ('full', 'partial')),
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT,
    refunded_by INTEGER NOT NULL,
    refund_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_bill_refunds_bill_id FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_refunds_refunded_by FOREIGN KEY (refunded_by) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_refund_amount_positive CHECK (refund_amount > 0)
);

-- Create bill_refund_items table to track individual items refunded
CREATE TABLE IF NOT EXISTS bill_refund_items (
    id SERIAL PRIMARY KEY,
    refund_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_bill_refund_items_refund_id FOREIGN KEY (refund_id) REFERENCES bill_refunds(id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_refund_items_part_id FOREIGN KEY (part_id) REFERENCES parts(id),
    
    -- Constraints
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_total_price_positive CHECK (total_price > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bill_refunds_bill_id ON bill_refunds(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_refunds_refund_date ON bill_refunds(refund_date);
CREATE INDEX IF NOT EXISTS idx_bill_refunds_refunded_by ON bill_refunds(refunded_by);
CREATE INDEX IF NOT EXISTS idx_bill_refunds_refund_type ON bill_refunds(refund_type);

CREATE INDEX IF NOT EXISTS idx_bill_refund_items_refund_id ON bill_refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_bill_refund_items_part_id ON bill_refund_items(part_id);

-- Create a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bill_refunds_updated_at
    BEFORE UPDATE ON bill_refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_refunds_updated_at();

-- Add a function to validate that total_price equals quantity * unit_price
CREATE OR REPLACE FUNCTION validate_refund_item_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_price != (NEW.quantity * NEW.unit_price) THEN
        RAISE EXCEPTION 'total_price must equal quantity * unit_price';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_refund_item_total
    BEFORE INSERT OR UPDATE ON bill_refund_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_refund_item_total();

-- Grant permissions to the application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE ON bill_refunds TO carparts_user;
-- GRANT SELECT, INSERT, UPDATE ON bill_refund_items TO carparts_user;
-- GRANT USAGE ON SEQUENCE bill_refunds_id_seq TO carparts_user;
-- GRANT USAGE ON SEQUENCE bill_refund_items_id_seq TO carparts_user;

SELECT 'Refund tracking tables created successfully!' as status;
