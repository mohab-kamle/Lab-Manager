-- Migration: Update comment field to TEXT and wrap existing comments in <p> tags
-- Date: 2025-01-25
-- Description: Changes comment field from VARCHAR(255) to TEXT to support rich text formatting
--              and wraps existing plain text comments in <p> tags for HTML compatibility

-- Step 1: Update the comment field type from VARCHAR(255) to TEXT
ALTER TABLE medical_report MODIFY COLUMN comment TEXT;

-- Step 2: Wrap existing non-null, non-empty comments in <p> tags
-- This ensures backward compatibility with existing plain text comments
UPDATE medical_report 
SET comment = CONCAT('<p>', comment, '</p>') 
WHERE comment IS NOT NULL 
  AND comment != '' 
  AND comment NOT LIKE '<p>%';

-- Step 3: Add a comment to document the change
-- (This is just for documentation purposes)
-- ALTER TABLE medical_report COMMENT = 'Updated comment field to TEXT for rich text support - 2025-01-25';

-- Verification query (uncomment to run manually):
-- SELECT id, comment FROM medical_report WHERE comment IS NOT NULL LIMIT 10;