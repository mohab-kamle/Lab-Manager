-- Fix medical_report_has_tg table to allow multiple test groups per medical report
-- Remove the problematic unique constraint that prevents many-to-many relationship

-- Drop the unique constraint that only allows one test group per medical report
ALTER TABLE medical_report_has_tg 
DROP INDEX medical_report_has_tg_tg_id_medical_report_id_unique;

-- Verify the fix by showing the table structure
SELECT 'medical_report_has_tg unique constraint removed successfully' AS status;
SHOW CREATE TABLE medical_report_has_tg;