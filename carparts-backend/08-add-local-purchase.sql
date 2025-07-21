-- Add local_purchase boolean column to parts table, default false
ALTER TABLE parts ADD COLUMN local_purchase BOOLEAN NOT NULL DEFAULT FALSE;
