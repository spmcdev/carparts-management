-- Enhance reservation system to support multiple items per reservation
-- This migration creates:
-- 1. Enhanced reservations table (multi-item support)
-- 2. reservation_items table for individual items
-- 3. Migration from old single-item system

-- Create new enhanced reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    reservation_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - deposit_amount) STORED,
    status VARCHAR(50) DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'cancelled')),
    reserved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    cancelled_date TIMESTAMP,
    completed_by INTEGER,
    created_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_reservations_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_reservations_completed_by FOREIGN KEY (completed_by) REFERENCES users(id),
    
    -- Constraints (removed the problematic constraint)
    CONSTRAINT chk_amounts_positive CHECK (total_amount >= 0 AND deposit_amount >= 0)
);

-- Create reservation_items table for individual items in each reservation
CREATE TABLE IF NOT EXISTS reservation_items (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_reservation_items_reservation_id FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    CONSTRAINT fk_reservation_items_part_id FOREIGN KEY (part_id) REFERENCES parts(id),
    
    -- Constraints
    CONSTRAINT chk_reservation_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_reservation_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_reservation_total_price_positive CHECK (total_price > 0),
    
    -- Unique constraint to prevent duplicate items in same reservation
    CONSTRAINT uq_reservation_items_reservation_part UNIQUE (reservation_id, part_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_number ON reservations(reservation_number);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_phone ON reservations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_name ON reservations(customer_name);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_reserved_date ON reservations(reserved_date);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON reservations(created_by);

CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation_id ON reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_items_part_id ON reservation_items(part_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_reservations_updated_at();

-- Add trigger to validate that total_price equals quantity * unit_price for reservation items
CREATE OR REPLACE FUNCTION validate_reservation_item_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_price != (NEW.quantity * NEW.unit_price) THEN
        RAISE EXCEPTION 'total_price must equal quantity * unit_price';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_reservation_item_total
    BEFORE INSERT OR UPDATE ON reservation_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_reservation_item_total();

-- Function to automatically update reservation total when items change
CREATE OR REPLACE FUNCTION update_reservation_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the reservation total based on current items
    UPDATE reservations 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM reservation_items 
        WHERE reservation_id = COALESCE(NEW.reservation_id, OLD.reservation_id)
    )
    WHERE id = COALESCE(NEW.reservation_id, OLD.reservation_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to validate deposit amount doesn't exceed total (called after total is updated)
CREATE OR REPLACE FUNCTION validate_reservation_deposit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if the reservation has items (total_amount > 0)
    IF NEW.total_amount > 0 AND NEW.deposit_amount > NEW.total_amount THEN
        RAISE EXCEPTION 'Deposit amount (%) cannot exceed total reservation amount (%)', 
            NEW.deposit_amount, NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate deposit after total is updated
CREATE TRIGGER trigger_validate_reservation_deposit
    BEFORE UPDATE OF total_amount, deposit_amount ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION validate_reservation_deposit();

-- Create triggers to update reservation total when items are added/updated/deleted
CREATE TRIGGER trigger_update_reservation_total_on_insert
    AFTER INSERT ON reservation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_total();

CREATE TRIGGER trigger_update_reservation_total_on_update
    AFTER UPDATE ON reservation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_total();

CREATE TRIGGER trigger_update_reservation_total_on_delete
    AFTER DELETE ON reservation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_total();

-- Migrate existing reserved_bills data to new structure (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reserved_bills') THEN
        -- Migrate existing reservations
        INSERT INTO reservations (
            reservation_number, customer_name, customer_phone, 
            total_amount, deposit_amount, status, reserved_date, 
            completed_date, completed_by, created_by, notes
        )
        SELECT 
            reservation_number, customer_name, customer_phone,
            price_agreed, deposit_amount, status, reserved_date,
            completed_date, completed_by, created_by, notes
        FROM reserved_bills
        WHERE NOT EXISTS (
            SELECT 1 FROM reservations 
            WHERE reservation_number = reserved_bills.reservation_number
        );
        
        -- Migrate existing reservation items
        INSERT INTO reservation_items (
            reservation_id, part_id, part_name, manufacturer, 
            quantity, unit_price, total_price
        )
        SELECT 
            r.id, rb.part_id, p.name, p.manufacturer,
            1, rb.price_agreed, rb.price_agreed
        FROM reserved_bills rb
        JOIN reservations r ON r.reservation_number = rb.reservation_number
        JOIN parts p ON p.id = rb.part_id
        WHERE NOT EXISTS (
            SELECT 1 FROM reservation_items ri
            WHERE ri.reservation_id = r.id AND ri.part_id = rb.part_id
        );
        
        RAISE NOTICE 'Migrated existing reservations from reserved_bills table';
    END IF;
END $$;

-- Create enhanced reservation number generator function
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS VARCHAR(100) AS $$
DECLARE
    new_number VARCHAR(100);
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'RES-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this number already exists
        IF NOT EXISTS (
            SELECT 1 FROM reservations WHERE reservation_number = new_number
            UNION ALL
            SELECT 1 FROM reserved_bills WHERE reservation_number = new_number
        ) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 9999 THEN
            RAISE EXCEPTION 'Unable to generate unique reservation number for today';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to the application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON reservations TO carparts_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON reservation_items TO carparts_user;
-- GRANT USAGE ON SEQUENCE reservations_id_seq TO carparts_user;
-- GRANT USAGE ON SEQUENCE reservation_items_id_seq TO carparts_user;

SELECT 'Enhanced reservation system created successfully!' as status;
