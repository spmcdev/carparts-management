-- CONSOLIDATED MIGRATION FILE
-- This file combines all database migrations 01-18 into a single schema
-- 
-- ⚠️  WARNING: This is a consolidated view for reference
-- ⚠️  DO NOT run this on an existing database as it will DROP all tables
-- ⚠️  This is intended for fresh database installations only
--
-- Migration history consolidated:
-- 01: Initial parts table
-- 02: Users table with admin user
-- 03: Add stock_status, available_from, sold_date to parts
-- 04: Add parent_id to parts
-- 05: Add recommended_price to parts
-- 06: Add sold_price to parts
-- 07: Add cost_price to parts
-- 08: Add local_purchase to parts
-- 09: Create bills table
-- 10: Upgrade admin to superadmin
-- 11: Create audit_log table
-- 12: Add customer_phone to bills
-- 13: Add container_no to parts
-- 14: Create reserved_bills table
-- 15: Update bills table (remove unique constraint, add refund fields)
-- 16: Comprehensive quantity management system (REBUILT SCHEMA)
-- 17: Create refund tracking tables (bill_refunds, bill_refund_items)
-- 18: Enhanced reservation system (reservations, reservation_items)

-- ===========================================================================
-- FRESH DATABASE INSTALLATION SCHEMA
-- ===========================================================================

-- Drop existing tables if they exist (for clean installation)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS bill_refund_items CASCADE;
DROP TABLE IF EXISTS bill_refunds CASCADE;
DROP TABLE IF EXISTS reservation_items CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reserved_bills CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ===========================================================================
-- USERS TABLE
-- ===========================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default superadmin user
-- Password is 'admin123' hashed with bcrypt
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm', 'superadmin')
ON CONFLICT (username) DO UPDATE SET 
  password = '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm',
  role = 'superadmin';

-- ===========================================================================
-- PARTS TABLE (with complete schema from all migrations)
-- ===========================================================================
CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    part_number VARCHAR(255) UNIQUE,
    
    -- Quantity tracking fields (Migration 16)
    total_stock INTEGER NOT NULL DEFAULT 1,
    available_stock INTEGER NOT NULL DEFAULT 1,
    sold_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER NOT NULL DEFAULT 0,
    
    -- Price fields (Migrations 05, 06, 07)
    cost_price DECIMAL(10,2),
    recommended_price DECIMAL(10,2),
    
    -- Status and dates (Migration 03)
    stock_status VARCHAR(50) DEFAULT 'available',
    available_from DATE DEFAULT CURRENT_DATE,
    sold_date DATE,
    
    -- Additional fields
    parent_id INTEGER,                              -- Migration 04
    container_no VARCHAR(255),                      -- Migration 13
    local_purchase BOOLEAN DEFAULT false,           -- Migration 08
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (parent_id) REFERENCES parts(id),
    CONSTRAINT check_stock_consistency CHECK (total_stock = available_stock + sold_stock + reserved_stock),
    CONSTRAINT check_positive_stock CHECK (
        total_stock >= 0 AND 
        available_stock >= 0 AND 
        sold_stock >= 0 AND 
        reserved_stock >= 0
    )
);

-- ===========================================================================
-- BILLS TABLE (enhanced from migrations 09, 12, 15, 16)
-- ===========================================================================
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100),                       -- Nullable (Migration 15)
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),                     -- Migration 12
    total_amount DECIMAL(10,2) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,     -- Migration 16
    
    -- Status tracking (Migration 15)
    status VARCHAR(20) DEFAULT 'active',            -- active, refunded, partially_refunded
    
    -- Refund tracking (Migration 15)
    refund_date DATE,
    refund_reason TEXT,
    refund_amount DECIMAL(10,2),
    refunded_by INTEGER,
    
    -- Timestamps and user tracking
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (refunded_by) REFERENCES users(id)
);

-- ===========================================================================
-- BILL ITEMS TABLE (Migration 16)
-- ===========================================================================
CREATE TABLE bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    part_name VARCHAR(255) NOT NULL,                -- Snapshot at time of sale
    manufacturer VARCHAR(255),                      -- Snapshot at time of sale
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    
    -- Constraints
    CONSTRAINT check_positive_quantity CHECK (quantity > 0),
    CONSTRAINT check_positive_prices CHECK (unit_price >= 0 AND total_price >= 0),
    CONSTRAINT check_total_calculation CHECK (total_price = quantity * unit_price)
);

-- ===========================================================================
-- RESERVATIONS SYSTEM (Migration 18 - Enhanced Multi-Item)
-- ===========================================================================
CREATE TABLE reservations (
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
    
    -- Constraints
    CONSTRAINT chk_amounts_positive CHECK (total_amount >= 0 AND deposit_amount >= 0)
);

CREATE TABLE reservation_items (
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

-- ===========================================================================
-- LEGACY RESERVED BILLS TABLE (Migration 14 - Keep for compatibility)
-- ===========================================================================
CREATE TABLE reserved_bills (
    id SERIAL PRIMARY KEY,
    reservation_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    part_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_agreed DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (price_agreed - deposit_amount) STORED,
    status VARCHAR(50) DEFAULT 'reserved',
    reserved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    completed_by INTEGER,
    created_by INTEGER,
    notes TEXT,
    
    -- Foreign keys
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT check_positive_reservation_quantity CHECK (quantity > 0)
);

-- ===========================================================================
-- REFUND TRACKING SYSTEM (Migration 17)
-- ===========================================================================
CREATE TABLE bill_refunds (
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

CREATE TABLE bill_refund_items (
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

-- ===========================================================================
-- STOCK MOVEMENTS TABLE (Migration 16)
-- ===========================================================================
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL,
    movement_type VARCHAR(50) NOT NULL,            -- 'sale', 'reservation', 'return', 'adjustment', 'restock'
    quantity INTEGER NOT NULL,                      -- positive for increase, negative for decrease
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    reference_type VARCHAR(50),                     -- 'bill', 'reservation', 'manual'
    reference_id INTEGER,                           -- bill_id, reservation_id, etc.
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ===========================================================================
-- AUDIT LOG TABLE (Migration 11)
-- ===========================================================================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ===========================================================================
-- INDEXES FOR PERFORMANCE
-- ===========================================================================

-- Parts table indexes
CREATE INDEX idx_parts_stock_status ON parts(stock_status);
CREATE INDEX idx_parts_available_stock ON parts(available_stock);
CREATE INDEX idx_parts_name ON parts(name);
CREATE INDEX idx_parts_manufacturer ON parts(manufacturer);
CREATE INDEX idx_parts_container_no ON parts(container_no);

-- Bills table indexes
CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_customer_name ON bills(customer_name);
CREATE INDEX idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX idx_bills_date ON bills(date);
CREATE INDEX idx_bills_status ON bills(status);

-- Bill items indexes
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_part_id ON bill_items(part_id);

-- Reservations indexes
CREATE INDEX idx_reservations_reservation_number ON reservations(reservation_number);
CREATE INDEX idx_reservations_customer_phone ON reservations(customer_phone);
CREATE INDEX idx_reservations_customer_name ON reservations(customer_name);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_reserved_date ON reservations(reserved_date);
CREATE INDEX idx_reservations_created_by ON reservations(created_by);

-- Reservation items indexes
CREATE INDEX idx_reservation_items_reservation_id ON reservation_items(reservation_id);
CREATE INDEX idx_reservation_items_part_id ON reservation_items(part_id);

-- Legacy reserved bills indexes
CREATE INDEX idx_reserved_bills_reservation_number ON reserved_bills(reservation_number);
CREATE INDEX idx_reserved_bills_customer_phone ON reserved_bills(customer_phone);
CREATE INDEX idx_reserved_bills_status ON reserved_bills(status);
CREATE INDEX idx_reserved_bills_part_id ON reserved_bills(part_id);

-- Refund tracking indexes
CREATE INDEX idx_bill_refunds_bill_id ON bill_refunds(bill_id);
CREATE INDEX idx_bill_refunds_refund_date ON bill_refunds(refund_date);
CREATE INDEX idx_bill_refunds_refunded_by ON bill_refunds(refunded_by);
CREATE INDEX idx_bill_refunds_refund_type ON bill_refunds(refund_type);
CREATE INDEX idx_bill_refund_items_refund_id ON bill_refund_items(refund_id);
CREATE INDEX idx_bill_refund_items_part_id ON bill_refund_items(part_id);

-- Stock movements indexes
CREATE INDEX idx_stock_movements_part_id ON stock_movements(part_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);

-- Audit log indexes
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- ===========================================================================
-- TRIGGERS AND FUNCTIONS
-- ===========================================================================

-- Function to automatically update stock_status based on available_stock
CREATE OR REPLACE FUNCTION update_part_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.available_stock > 0 THEN
        NEW.stock_status = 'available';
    ELSIF NEW.reserved_stock > 0 THEN
        NEW.stock_status = 'reserved';
    ELSE
        NEW.stock_status = 'sold';
    END IF;
    
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_part_stock_status
    BEFORE INSERT OR UPDATE ON parts
    FOR EACH ROW
    EXECUTE FUNCTION update_part_stock_status();

-- Function to log stock movements
CREATE OR REPLACE FUNCTION log_stock_movement(
    p_part_id INTEGER,
    p_movement_type VARCHAR(50),
    p_quantity INTEGER,
    p_previous_available INTEGER,
    p_new_available INTEGER,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_reference_id INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    movement_id INTEGER;
BEGIN
    INSERT INTO stock_movements (
        part_id, movement_type, quantity, previous_available, new_available,
        reference_type, reference_id, notes, created_by
    ) VALUES (
        p_part_id, p_movement_type, p_quantity, p_previous_available, p_new_available,
        p_reference_type, p_reference_id, p_notes, p_created_by
    ) RETURNING id INTO movement_id;
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql;

-- Reservation system triggers and functions
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

-- Validation functions
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

-- Refund tracking timestamp update trigger
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

-- Enhanced reservation number generator function
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

-- ===========================================================================
-- SAMPLE DATA FOR TESTING
-- ===========================================================================
INSERT INTO parts (name, manufacturer, total_stock, available_stock, recommended_price, cost_price) VALUES
('Brake Pad', 'Bosch', 10, 10, 1500.00, 1200.00),
('Oil Filter', 'Mann Filter', 25, 25, 800.00, 600.00),
('Air Filter', 'K&N', 15, 15, 1200.00, 900.00),
('Spark Plug', 'NGK', 50, 50, 300.00, 200.00),
('Windshield Wiper', 'Bosch', 20, 20, 600.00, 400.00);

-- ===========================================================================
-- COMPLETION MESSAGE
-- ===========================================================================
SELECT 'Consolidated migration completed successfully!' as status;
SELECT 'Database schema includes all features from migrations 01-18' as info;
SELECT 'Tables created: users, parts, bills, bill_items, reservations, reservation_items, reserved_bills, bill_refunds, bill_refund_items, stock_movements, audit_log' as tables;
