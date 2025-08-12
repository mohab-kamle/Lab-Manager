# Database Redesign: Test Group Results Optimization

## Overview

This document outlines the implementation of **Option 1: Flatten the structure** for optimizing the `medical_report_tg_field_value` table by replacing it with a simplified `test_group_result` table that uses JSON storage.

## Problem Statement

The original `medical_report_tg_field_value` table was over-normalized, leading to:
- Large, complex SQL queries
- Performance issues due to multiple JOINs
- Difficult data management
- Slow query execution times

## Solution: JSON-Based Storage

We've implemented a new `test_group_result` table that:
- Stores field values as JSON in a single `result_json` column
- Reduces the number of database records significantly
- Simplifies queries and improves performance
- Maintains data integrity through proper foreign key relationships

## New Database Structure

### `test_group_result` Table Schema

```sql
CREATE TABLE test_group_result (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medical_report_id INT NOT NULL,
  test_group_id INT NOT NULL,
  tg_component_id INT NOT NULL,
  result_json JSON NOT NULL COMMENT 'Stores field values as JSON: {field_id: value}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (medical_report_id) REFERENCES medical_report(id) ON DELETE CASCADE,
  FOREIGN KEY (test_group_id) REFERENCES test_group(id) ON DELETE CASCADE,
  FOREIGN KEY (tg_component_id) REFERENCES tg_component(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_medical_report_test_group (medical_report_id, test_group_id),
  INDEX idx_test_group_component (test_group_id, tg_component_id),
  INDEX idx_medical_report_component (medical_report_id, tg_component_id),
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE KEY unique_report_group_component (medical_report_id, test_group_id, tg_component_id)
);
```

### Data Structure Comparison

#### Before (Old Structure)
```
medical_report_tg_field_value:
- medical_report_id: 1
- test_group_id: 5
- tg_component_id: 10
- tg_fields_id: 15
- value: "Normal"

- medical_report_id: 1
- test_group_id: 5
- tg_component_id: 10
- tg_fields_id: 16
- value: "5.2"
```

#### After (New Structure)
```
test_group_result:
- medical_report_id: 1
- test_group_id: 5
- tg_component_id: 10
- result_json: {"15": "Normal", "16": "5.2"}
```

## Implementation Files

### 1. Model Definition
**File:** `server/models/test_group_result.js`
- Defines the new Sequelize model
- Includes proper associations and validations
- Uses JSON data type for `result_json` field

### 2. Database Migration
**File:** `server/migrations/20250120_create_test_group_result_table.sql`
- Creates the new `test_group_result` table
- Adds all necessary indexes and constraints
- Includes proper foreign key relationships

### 3. Data Migration Script
**File:** `server/scripts/migrate_to_test_group_result.js`
- Transfers existing data from `medical_report_tg_field_value` to `test_group_result`
- Groups field values by component and converts to JSON
- Includes data integrity verification
- Processes data in batches for performance

### 4. Model Associations
**File:** `server/models/init-models.js`
- Added `test_group_result` model initialization
- Defined associations with `medical_report`, `test_group`, and `tg_component`
- Maintains backward compatibility

### 5. API Route Updates
**File:** `server/routes/medical_reports.js`
- Updated include statements to use `test_group_result`
- Modified `saveTestGroupValuesWithRetry()` function for JSON storage
- Updated test-groups GET endpoint to read JSON data
- Simplified data retrieval logic

## Migration Steps

### Step 1: Create New Table
```bash
# Execute the SQL migration
mysql -u [username] -p [database_name] < server/migrations/20250120_create_test_group_result_table.sql
```

### Step 2: Migrate Existing Data
```bash
# Run the data migration script
node server/scripts/migrate_to_test_group_result.js
```

### Step 3: Test the Application
```bash
# Start the server and test functionality
cd server
npm start
```

### Step 4: Verify Data Integrity
- Test creating new medical reports with test groups
- Verify existing data is accessible
- Check that field values are properly stored and retrieved
- Ensure all associations work correctly

## Performance Benefits

### Query Optimization
- **Before:** Complex queries with multiple JOINs across 4+ tables
- **After:** Simple queries with minimal JOINs using JSON extraction

### Storage Efficiency
- **Before:** One row per field value (potentially hundreds of rows per component)
- **After:** One row per component with all field values in JSON

### Maintenance Benefits
- Simplified data structure
- Easier backup and restore operations
- Reduced index maintenance overhead
- Better query plan optimization

## API Changes

### Data Structure
The API response structure remains the same for backward compatibility, but internally:
- Field values are now stored as JSON objects
- Retrieval is more efficient
- Updates are atomic per component

### New Features
- Atomic updates per component (all field values updated together)
- Better transaction handling
- Improved error handling and retry logic

## Rollback Plan

If needed, you can rollback by:
1. Keeping the old `medical_report_tg_field_value` table (don't drop it yet)
2. Reverting the code changes in `medical_reports.js`
3. Reverting the model associations in `init-models.js`
4. The old data remains intact for fallback

## Future Cleanup

After confirming the new system works correctly:
1. Remove references to `medical_report_tg_field_value` from the codebase
2. Drop the old `medical_report_tg_field_value` table
3. Remove the old model file
4. Update any remaining documentation

## Testing Checklist

- [ ] Create new medical reports with test groups
- [ ] Save field values for test group components
- [ ] Retrieve test group data and verify field values
- [ ] Update existing field values
- [ ] Delete test group results
- [ ] Verify foreign key constraints work
- [ ] Test with multiple components per test group
- [ ] Verify JSON data integrity
- [ ] Check performance improvements
- [ ] Test error handling and retry logic

## Notes

- All field values are now stored as JSON, maintaining their original data types
- The migration script preserves all existing data
- Foreign key constraints ensure data integrity
- Indexes are optimized for common query patterns
- The implementation includes comprehensive error handling and logging

---

**Implementation Date:** January 20, 2025  
**Status:** Ready for testing  
**Next Steps:** Run migrations and test functionality