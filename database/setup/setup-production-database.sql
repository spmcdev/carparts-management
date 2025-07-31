-- PRODUCTION DATABASE SETUP SCRIPT
-- This script sets up the production database for the carparts management system
-- Run this script in your Railway Production PostgreSQL console

-- ===========================================================================
-- PRODUCTION DATABASE INSTALLATION
-- ===========================================================================

-- Drop existing tables if they exist (use with caution in production)
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS bill_refund_items CASCADE;
-- DROP TABLE IF EXISTS bill_refunds CASCADE;
-- DROP TABLE IF EXISTS reservation_items CASCADE;
-- DROP TABLE IF EXISTS reservations CASCADE;
-- DROP TABLE IF EXISTS reserved_bills CASCADE;
-- DROP TABLE IF EXISTS bill_items CASCADE;
-- DROP TABLE IF EXISTS bills CASCADE;
-- DROP TABLE IF EXISTS stock_movements CASCADE;
-- DROP TABLE IF EXISTS parts CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ===========================================================================
-- USERS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================================
-- PARTS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS parts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    part_number VARCHAR(255) UNIQUE,
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    recommended_price DECIMAL(10,2),
    sold_price DECIMAL(10,2),
    container_no VARCHAR(255),
    is_local_purchase BOOLEAN DEFAULT false,
    parent_id INTEGER,
    
    -- Quantity Management (Post-Migration 16)
    available_stock INTEGER DEFAULT 0,
    sold_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    total_stock INTEGER GENERATED ALWAYS AS (available_stock + sold_stock + reserved_stock) STORED,
    
    -- Status and Dates
    stock_status VARCHAR(50) DEFAULT 'available',
    available_from DATE DEFAULT CURRENT_DATE,
    sold_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (parent_id) REFERENCES parts(id),
    CONSTRAINT positive_available_stock CHECK (available_stock >= 0),
    CONSTRAINT positive_sold_stock CHECK (sold_stock >= 0),
    CONSTRAINT positive_reserved_stock CHECK (reserved_stock >= 0)
);

-- ===========================================================================
-- STOCK MOVEMENTS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'return', 'adjustment', 'reservation', 'release'
    quantity INTEGER NOT NULL,
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    reason VARCHAR(50), -- 'sale', 'purchase', 'refund', 'adjustment', 'reservation', 'cancellation'
    reference_id INTEGER, -- bill_id, reservation_id, etc.
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ===========================================================================
-- BILLS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Bill Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'partially_refunded', 'refunded'
    
    -- Refund Information
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_date DATE,
    refund_reason TEXT,
    refunded_by INTEGER,
    
    -- Timestamps
    bill_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (refunded_by) REFERENCES users(id)
);

-- ===========================================================================
-- BILL ITEMS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_unit_price CHECK (unit_price >= 0),
    CONSTRAINT positive_total_price CHECK (total_price >= 0)
);

-- ===========================================================================
-- REFUND TRACKING TABLES
-- ===========================================================================

-- Bill Refunds Table
CREATE TABLE IF NOT EXISTS bill_refunds (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT,
    refund_type VARCHAR(50) DEFAULT 'full', -- 'full', 'partial'
    refund_date DATE DEFAULT CURRENT_DATE,
    refunded_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (refunded_by) REFERENCES users(id),
    CONSTRAINT positive_refund_amount CHECK (refund_amount > 0)
);

-- Bill Refund Items Table
CREATE TABLE IF NOT EXISTS bill_refund_items (
    id SERIAL PRIMARY KEY,
    refund_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (refund_id) REFERENCES bill_refunds(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    CONSTRAINT positive_refund_quantity CHECK (quantity > 0),
    CONSTRAINT positive_refund_unit_price CHECK (unit_price >= 0),
    CONSTRAINT positive_refund_total_price CHECK (total_price >= 0)
);

-- ===========================================================================
-- RESERVATION SYSTEM TABLES
-- ===========================================================================

-- Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    expiry_date DATE,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT positive_total_amount CHECK (total_amount >= 0)
);

-- Reservation Items Table
CREATE TABLE IF NOT EXISTS reservation_items (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    CONSTRAINT positive_reservation_quantity CHECK (quantity > 0),
    CONSTRAINT positive_reservation_unit_price CHECK (unit_price >= 0),
    CONSTRAINT positive_reservation_total_price CHECK (total_price >= 0)
);

-- ===========================================================================
-- AUDIT LOG TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    request_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ===========================================================================
-- INDEXES FOR PERFORMANCE
-- ===========================================================================

-- Parts table indexes
CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer ON parts(manufacturer);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_stock_status ON parts(stock_status);
CREATE INDEX IF NOT EXISTS idx_parts_available_stock ON parts(available_stock);

-- Bills table indexes
CREATE INDEX IF NOT EXISTS idx_bills_customer_name ON bills(customer_name);
CREATE INDEX IF NOT EXISTS idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Bill items indexes
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_part_id ON bill_items(part_id);

-- Refund tracking indexes
CREATE INDEX IF NOT EXISTS idx_bill_refunds_bill_id ON bill_refunds(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_refunds_refund_date ON bill_refunds(refund_date);
CREATE INDEX IF NOT EXISTS idx_bill_refund_items_refund_id ON bill_refund_items(refund_id);

-- Reservation indexes
CREATE INDEX IF NOT EXISTS idx_reservations_customer_name ON reservations(customer_name);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation_id ON reservation_items(reservation_id);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_part_id ON stock_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ===========================================================================
-- CREATE PRODUCTION ADMIN USER
-- ===========================================================================

-- Insert production admin user (change password before running)
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2b$10$8K1tXJQJxBW.QJ5K7YxXTOxwW4jPzZ5wGkB8uKjHxR1qN9P2sY3Le', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- Note: The password hash above is for 'admin123' - CHANGE THIS IN PRODUCTION!
-- To generate a new password hash, use: bcrypt.hashSync('your-password', 10)

-- ===========================================================================
-- VERIFICATION QUERIES
-- ===========================================================================

-- Check all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check user was created
SELECT id, username, role, created_at FROM users;

-- Check table row counts
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 
    'parts' as table_name, COUNT(*) as row_count FROM parts
UNION ALL SELECT 
    'bills' as table_name, COUNT(*) as row_count FROM bills
UNION ALL SELECT 
    'bill_items' as table_name, COUNT(*) as row_count FROM bill_items
UNION ALL SELECT 
    'bill_refunds' as table_name, COUNT(*) as row_count FROM bill_refunds
UNION ALL SELECT 
    'bill_refund_items' as table_name, COUNT(*) as row_count FROM bill_refund_items
UNION ALL SELECT 
    'reservations' as table_name, COUNT(*) as row_count FROM reservations
UNION ALL SELECT 
    'reservation_items' as table_name, COUNT(*) as row_count FROM reservation_items
UNION ALL SELECT 
    'stock_movements' as table_name, COUNT(*) as row_count FROM stock_movements
UNION ALL SELECT 
    'audit_log' as table_name, COUNT(*) as row_count FROM audit_log;

-- ===========================================================================
-- PRODUCTION SETUP COMPLETE
-- ===========================================================================

-- ✅ Database schema created
-- ✅ All tables with proper constraints
-- ✅ Indexes for performance
-- ✅ Admin user created (CHANGE PASSWORD!)
-- ✅ Ready for production use

-- Next steps:
-- 1. Change the admin password
-- 2. Set up proper environment variables
-- 3. Test database connectivity
-- 4. Import any existing data if needed
