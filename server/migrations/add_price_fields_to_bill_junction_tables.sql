-- Add price fields to bill junction tables to store prices at invoice creation time
-- This prevents price changes from affecting historical invoices

-- Add price field to bill_has_test
ALTER TABLE bill_has_test ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add price field to bill_has_culture  
ALTER TABLE bill_has_culture ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add price field to bill_has_package
ALTER TABLE bill_has_package ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add price field to bill_has_tg
ALTER TABLE bill_has_tg ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add indexes for better performance
CREATE INDEX idx_bill_has_test_price ON bill_has_test(price);
CREATE INDEX idx_bill_has_culture_price ON bill_has_culture(price);
CREATE INDEX idx_bill_has_package_price ON bill_has_package(price);
CREATE INDEX idx_bill_has_tg_price ON bill_has_tg(price); 