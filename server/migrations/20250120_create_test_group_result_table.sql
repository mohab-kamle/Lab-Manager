-- Migration: Create test_group_result table
-- Date: 2025-01-20
-- Purpose: Replace over-normalized medical_report_tg_field_value structure with simplified JSON-based approach
-- 
-- This migration creates a new table that stores test group field values as JSON objects,
-- significantly improving performance and reducing database complexity.

-- Create the new test_group_result table
CREATE TABLE test_group_result (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary key for test group result',
  medical_report_id INT NOT NULL COMMENT 'Foreign key reference to medical_report table',
  test_group_id INT NOT NULL COMMENT 'Foreign key reference to test_group table',
  tg_component_id INT NOT NULL COMMENT 'Foreign key reference to tg_component table',
  result_json JSON COMMENT 'JSON object containing field_name: value pairs for this component',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was created',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was last updated',
  
  -- Foreign key constraints with CASCADE delete to maintain referential integrity
  FOREIGN KEY (medical_report_id) REFERENCES medical_report(id) ON DELETE CASCADE,
  FOREIGN KEY (test_group_id) REFERENCES test_group(id) ON DELETE CASCADE,
  FOREIGN KEY (tg_component_id) REFERENCES tg_component(id) ON DELETE CASCADE,
  
  -- Performance indexes for efficient querying
  INDEX idx_test_group_result_medical_report (medical_report_id),
  INDEX idx_test_group_result_test_group (test_group_id),
  INDEX idx_test_group_result_component (tg_component_id),
  
  -- Unique constraint to prevent duplicate component results per medical report
  -- This ensures data integrity and prevents conflicting results
  UNIQUE KEY idx_test_group_result_composite (medical_report_id, test_group_id, tg_component_id)
);

-- Add table comment for documentation
ALTER TABLE test_group_result COMMENT = 'Simplified test group results storage using JSON for field values. Replaces the over-normalized medical_report_tg_field_value structure.';

-- Performance optimization: Add JSON functional indexes if MySQL version supports it
-- These indexes will improve performance when querying specific JSON fields
-- Note: Uncomment these if your MySQL version is 8.0.13 or later
-- CREATE INDEX idx_test_group_result_json_keys ON test_group_result ((JSON_KEYS(result_json)));
-- CREATE INDEX idx_test_group_result_json_length ON test_group_result ((JSON_LENGTH(result_json)));

-- Log the migration completion
SELECT 'test_group_result table created successfully' AS migration_status;