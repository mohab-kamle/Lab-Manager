-- Migration: Add reference_range and result_type to test_component
ALTER TABLE test_component
  ADD COLUMN reference_range TEXT NULL,
  ADD COLUMN result_type ENUM('range', 'boolean') NOT NULL DEFAULT 'range'; 