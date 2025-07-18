-- Add discount_amount field to contract table
ALTER TABLE contract ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER discount_type;

-- Update existing contracts to have default discount amount
UPDATE contract SET discount_amount = 0.00 WHERE discount_amount IS NULL; 