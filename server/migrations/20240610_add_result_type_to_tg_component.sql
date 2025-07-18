-- Add result_type column to tg_component table
-- This allows test group components to support both range and boolean result types

ALTER TABLE tg_component 
ADD COLUMN result_type ENUM('range', 'boolean') NOT NULL DEFAULT 'range' 
AFTER reference_range;

-- Update existing records to have 'range' as default
UPDATE tg_component SET result_type = 'range' WHERE result_type IS NULL; 