-- Add deleted_at column to test_group table for soft delete functionality (safe version)
-- Check if column exists first
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'test_group' 
     AND COLUMN_NAME = 'deleted_at') = 0,
    'ALTER TABLE test_group ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL',
    'SELECT "Column deleted_at already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on deleted_at for better query performance (safe version)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'test_group' 
     AND INDEX_NAME = 'idx_test_group_deleted_at') = 0,
    'CREATE INDEX idx_test_group_deleted_at ON test_group(deleted_at)',
    'SELECT "Index idx_test_group_deleted_at already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 