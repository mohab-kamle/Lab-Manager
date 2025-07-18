-- Migration: Add price column to test_group table
ALTER TABLE test_group ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00;
