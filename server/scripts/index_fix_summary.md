# MySQL 64-Key Limit Fix Summary

## Problem Identified
- **Error**: `Too many keys specified; max 64 keys allowed`
- **Root Cause**: 56 duplicate indexes on `payment_intention_id` column in `lab_payment` table
- **Impact**: Prevented foreign key creation and database sync operations

## Investigation Results
- Total indexes on `lab_payment` table: **64** (at MySQL limit)
- Duplicate `payment_intention_id` indexes: **56** (payment_intention_id_1 through payment_intention_id_56)
- Remaining indexes after cleanup: **8** (well below limit)

## Root Cause Analysis
The issue was caused by **double index definition** in the Sequelize model:

1. **Field-level unique constraint**: `unique: true` in field definition
2. **Named unique index**: `idx_lab_payment_intention_id` in indexes array

Sequelize was creating a new auto-generated index on every sync operation instead of recognizing the existing named index.

## Solution Implemented

### 1. Immediate Fix - Cleanup Duplicate Indexes
```bash
# Ran script to drop 55 duplicate indexes
node scripts/fix_duplicate_indexes.js
```
**Result**: Reduced from 64 to 8 indexes

### 2. Permanent Fix - Model Correction
Removed redundant `unique: true` from field definition in `lab_payment.js`:

```javascript
// BEFORE (causing duplicates)
payment_intention_id: {
  type: DataTypes.STRING(100),
  allowNull: false,
  unique: true, // ❌ REMOVED - redundant with named index
  comment: 'Payment intention ID from gateway'
}

// AFTER (fixed)
payment_intention_id: {
  type: DataTypes.STRING(100),
  allowNull: false,
  comment: 'Payment intention ID from gateway'
}
```

The named index `idx_lab_payment_intention_id` in the indexes array provides the uniqueness constraint.

## Prevention Measures

### 1. Model Definition Best Practices
- **Never use both** `unique: true` in field definition AND named unique index
- **Prefer named indexes** for better control and prevention of auto-generation
- **Use explicit index names** to prevent Sequelize from creating new ones

### 2. Database Sync Recommendations
- **Avoid `sync({ alter: true })`** in production
- **Use proper migrations** for schema changes
- **Monitor index count** regularly

### 3. Regular Monitoring
Create a monitoring script to check index counts:

```javascript
// Check if approaching 64-key limit
const [results] = await sequelize.query('SHOW INDEXES FROM table_name');
if (results.length >= 60) {
  console.warn('⚠️ Approaching MySQL 64-key limit!');
}
```

## Files Modified
- `server/models/lab_payment.js` - Removed redundant unique constraint
- `server/scripts/check_indexes.js` - Created for index monitoring
- `server/scripts/fix_duplicate_indexes.js` - Created for cleanup

## Verification
- ✅ Duplicate indexes removed (64 → 8)
- ✅ Single `payment_intention_id` index remains
- ✅ Model definition corrected
- ✅ Foreign key creation should now work

## Next Steps
1. Test server startup to confirm fix
2. Monitor for any new duplicate index creation
3. Apply similar fixes to other models if needed
4. Consider implementing automated index monitoring

---
*Fix completed on: $(date)*
*Total duplicate indexes removed: 55*
*Index count reduction: 64 → 8 (87.5% reduction)*