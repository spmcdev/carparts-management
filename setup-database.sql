-- Complete database setup for Railway PostgreSQL
-- Run this entire script in Railway's PostgreSQL console

-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    part_number VARCHAR(255) UNIQUE,
    purchase_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    stock_status VARCHAR(50) DEFAULT 'available',
    available_from DATE DEFAULT CURRENT_DATE,
    sold_date DATE,
    parent_id INTEGER,
    recommended_price DECIMAL(10,2),
    sold_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    is_local_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES parts(id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create bill_items table
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert initial superadmin user
-- Password is 'admin123' hashed with bcrypt
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm', 'superadmin')
ON CONFLICT (username) DO UPDATE SET 
  password = '$2b$10$LZ1P3O6gfPmBj7SZ2tKCtuC7LCM8v9FmsMjpF.1tzuDyFsNUnx2pm',
  role = 'superadmin';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_stock_status ON parts(stock_status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Verify setup
SELECT 'Database setup completed successfully!' as status;
SELECT 'Users created:' as info, COUNT(*) as count FROM users;
SELECT 'Tables created:' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public';
