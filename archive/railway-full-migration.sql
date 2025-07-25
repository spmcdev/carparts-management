CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'general'
);

-- Insert default admin user (username: admin, password: admin123)
-- INSERT INTO users (username, password, role)
-- VALUES ('admin', '$2b$10$wqjQwQnQwQnQwQnQwQnQOeQnQwQnQwQnQwQnQwQnQwQnQwQnQy', 'admin')
-- ON CONFLICT (username) DO NOTHING;
INSERT INTO users (username, password, role)
VALUES ('admin', '$2b$10$3v3WCeFUZoz46VhyZawcGeMXtD/moFyYvp1VMxGSdnV1a/8RjKwwm', 'admin')
ON CONFLICT (username) DO NOTHING;
-- The above password hash is a placeholder. Replace with a real bcrypt hash in the backend or migration script.
ALTER TABLE parts ADD COLUMN stock_status VARCHAR(50) DEFAULT 'available';
ALTER TABLE parts ADD COLUMN available_from DATE;
ALTER TABLE parts ADD COLUMN sold_date DATE;
ALTER TABLE parts ADD COLUMN parent_id INTEGER REFERENCES parts(id);
ALTER TABLE parts ADD COLUMN recommended_price NUMERIC(10,2);
ALTER TABLE parts ADD COLUMN sold_price NUMERIC(16,2);
-- Add cost_price column to parts table
ALTER TABLE parts ADD COLUMN cost_price NUMERIC(16,2);
-- Add local_purchase boolean column to parts table, default false
ALTER TABLE parts ADD COLUMN local_purchase BOOLEAN NOT NULL DEFAULT FALSE;
-- Create the bills table
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    items JSONB NOT NULL
);
-- Create audit_log table to track user actions
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
