-- Remove the redundant tg_id column from medical_report_has_tg table
-- This column is unnecessary since we already have test_group_id

ALTER TABLE medical_report_has_tg DROP COLUMN tg_id; 