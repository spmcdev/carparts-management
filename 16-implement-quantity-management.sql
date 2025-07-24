-- Comprehensive quantity management system implementation
-- This migration rebuilds the database schema to support quantity tracking
-- WARNING: This will rebuild tables - existing data will be lost

-- Drop existing tables and recreate with quantity support
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS reserved_bills CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create parts table with quantity management
CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    part_number VARCHAR(255) UNIQUE,
    
    -- Quantity tracking fields
    total_stock INTEGER NOT NULL DEFAULT 1,
    available_stock INTEGER NOT NULL DEFAULT 1,
    sold_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER NOT NULL DEFAULT 0,
    
    -- Price fields
    cost_price DECIMAL(10,2),
    recommended_price DECIMAL(10,2),
    
    -- Status and dates
    stock_status VARCHAR(50) DEFAULT 'available', -- overall status based on available_stock
    available_from DATE DEFAULT CURRENT_DATE,
    
    -- Additional fields
    parent_id INTEGER,
    container_no VARCHAR(255),
    local_purchase BOOLEAN DEFAULT false,
    
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

-- Create bills table with enhanced structure
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100), -- nullable, optional user input
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    total_amount DECIMAL(10,2) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active', -- active, refunded, partially_refunded
    
    -- Refund tracking
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

-- Create bill_items table for detailed line items
CREATE TABLE bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    part_name VARCHAR(255) NOT NULL, -- snapshot at time of sale
    manufacturer VARCHAR(255), -- snapshot at time of sale
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

-- Create reservations table
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
    status VARCHAR(50) DEFAULT 'reserved', -- reserved, completed, cancelled
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

-- Create stock movements table for audit trail
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'sale', 'reservation', 'return', 'adjustment', 'restock'
    quantity INTEGER NOT NULL, -- positive for increase, negative for decrease
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'bill', 'reservation', 'manual'
    reference_id INTEGER, -- bill_id, reservation_id, etc.
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create audit log table
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

-- Create indexes for performance
CREATE INDEX idx_parts_stock_status ON parts(stock_status);
CREATE INDEX idx_parts_available_stock ON parts(available_stock);
CREATE INDEX idx_parts_name ON parts(name);
CREATE INDEX idx_parts_manufacturer ON parts(manufacturer);
CREATE INDEX idx_parts_container_no ON parts(container_no);

CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_customer_name ON bills(customer_name);
CREATE INDEX idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX idx_bills_date ON bills(date);
CREATE INDEX idx_bills_status ON bills(status);

CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_part_id ON bill_items(part_id);

CREATE INDEX idx_reserved_bills_reservation_number ON reserved_bills(reservation_number);
CREATE INDEX idx_reserved_bills_customer_phone ON reserved_bills(customer_phone);
CREATE INDEX idx_reserved_bills_status ON reserved_bills(status);
CREATE INDEX idx_reserved_bills_part_id ON reserved_bills(part_id);

CREATE INDEX idx_stock_movements_part_id ON stock_movements(part_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- Insert default superadmin user
-- Password is 'admin123' hashed with bcrypt
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm', 'superadmin')
ON CONFLICT (username) DO UPDATE SET 
  password = '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm',
  role = 'superadmin';

-- Create function to automatically update stock_status based on available_stock
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

-- Create trigger to automatically update stock_status
CREATE TRIGGER trigger_update_part_stock_status
    BEFORE INSERT OR UPDATE ON parts
    FOR EACH ROW
    EXECUTE FUNCTION update_part_stock_status();

-- Create function to log stock movements
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

-- Insert sample data for testing
INSERT INTO parts (name, manufacturer, total_stock, available_stock, recommended_price, cost_price) VALUES
('Brake Pad', 'Bosch', 10, 10, 1500.00, 1200.00),
('Oil Filter', 'Mann Filter', 25, 25, 800.00, 600.00),
('Air Filter', 'K&N', 15, 15, 1200.00, 900.00),
('Spark Plug', 'NGK', 50, 50, 300.00, 200.00),
('Windshield Wiper', 'Bosch', 20, 20, 600.00, 400.00);

SELECT 'Quantity management system implemented successfully!' as status;
SELECT 'Sample parts created with stock quantities' as info;
