-- Migration to update test_component table
-- Replace normal_range column with normal_from and normal_to columns

-- Add new columns
ALTER TABLE test_component 
ADD COLUMN normal_from VARCHAR(45) AFTER normal_range,
ADD COLUMN normal_to VARCHAR(45) AFTER normal_from;

-- Update existing data (if any) - split existing normal_range values
-- This assumes existing normal_range values are in format like "10-20" or "5.5-15.2"
UPDATE test_component 
SET 
  normal_from = SUBSTRING_INDEX(normal_range, '-', 1),
  normal_to = SUBSTRING_INDEX(normal_range, '-', -1)
WHERE normal_range IS NOT NULL AND normal_range != '';

-- Drop the old column
ALTER TABLE test_component DROP COLUMN normal_range; 