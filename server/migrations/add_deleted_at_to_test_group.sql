-- Add deleted_at column to test_group table for soft delete functionality
ALTER TABLE test_group ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
 
-- Add index on deleted_at for better query performance
CREATE INDEX idx_test_group_deleted_at ON test_group(deleted_at); 