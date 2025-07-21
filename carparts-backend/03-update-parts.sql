ALTER TABLE parts ADD COLUMN stock_status VARCHAR(50) DEFAULT 'available';
ALTER TABLE parts ADD COLUMN available_from DATE;
ALTER TABLE parts ADD COLUMN sold_date DATE;
