-- Add name field to contract table
ALTER TABLE contract ADD COLUMN name VARCHAR(100) AFTER id;

-- Update existing contracts to have auto-generated names
UPDATE contract SET name = CONCAT(region, ' - ', governorate) WHERE name IS NULL OR name = ''; 