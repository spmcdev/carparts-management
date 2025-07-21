-- Create the bills table
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    items JSONB NOT NULL
);
