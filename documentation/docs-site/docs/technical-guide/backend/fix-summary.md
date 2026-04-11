# Fix Summary: Test Group Result JSON Field Storage Issue

## Problem Description
After implementing the database redesign, the `result_json` field in the `test_group_result` table was storing field IDs as keys instead of meaningful field names. This caused the JSON structure to change from:

**Expected (with field names):**
```json
{
  "Result": "",
  "Unit": "",
  "Status": "",
  "Relative count": "",
  "Absolute Count": "",
  "Normal Range": "",
  "Absolute range": "",
  "Relative Range": ""
}
```

**Actual (with field IDs):**
```json
{
  "1": "",
  "2": "FL",
  "3": "",
  "4": "",
  "5": "",
  "6": "",
  "7": "",
  "8": ""
}
```

## Root Cause
The issue occurred because:
1. The frontend sends field values using field IDs as keys (e.g., `{"1": "value", "2": "value"}`)
2. The `saveTestGroupValuesWithRetry` function was directly using these field IDs as JSON keys
3. The migration script expected field names as keys, creating a mismatch

## Solution Implemented

### 1. Updated Save Function (`saveTestGroupValuesWithRetry`)
**File:** `server/routes/medical_reports.js` (lines ~1526-1570)

**Changes:**
- Added database lookup to fetch field information for the test group
- Created a mapping from field ID to field name
- Modified the JSON creation logic to use field names as keys instead of field IDs
- Added fallback handling for unknown field IDs

**Key Code Addition:**
```javascript
// First, get all field information for this test group to map field IDs to field names
const testGroupFields = await db.tg_fields.findAll({
  where: {
    test_group_id: parseInt(test_group_id, 10),
    deleted_at: null // Only get active fields
  },
  attributes: ['id', 'name'],
  transaction: t
});

// Create a map of field ID to field name for quick lookup
const fieldIdToNameMap = {};
testGroupFields.forEach(field => {
  fieldIdToNameMap[field.id.toString()] = field.name;
});

// Convert field ID to field name for better JSON structure
const fieldName = fieldIdToNameMap[field_id] || `field_${field_id}`;
result_json[fieldName] = value !== null && value !== undefined ? value : null;
```

### 2. Updated Retrieval Function (GET `/:id/test-groups`)
**File:** `server/routes/medical_reports.js` (lines ~1395-1430)

**Changes:**
- Added reverse mapping from field names back to field IDs for frontend compatibility
- Ensured the frontend continues to receive field IDs as keys
- Added handling for legacy `field_X` format
- Added warning logs for unknown field names

**Key Code Addition:**
```javascript
// Create a map of field name to field ID for this test group
const fieldNameToIdMap = {};
(group.tg_fields || []).forEach(field => {
  fieldNameToIdMap[field.name] = field.id.toString();
});

// Convert field names back to field IDs for frontend compatibility
Object.entries(tgr.result_json).forEach(([fieldName, value]) => {
  const fieldId = fieldNameToIdMap[fieldName];
  if (fieldId) {
    componentValues[fieldId] = value;
  } else {
    // Handle legacy field_X format or unknown fields
    const legacyMatch = fieldName.match(/^field_(\d+)$/);
    if (legacyMatch) {
      componentValues[legacyMatch[1]] = value;
    }
  }
});
```

## Benefits of This Fix

1. **Meaningful JSON Storage**: Field names are now stored as keys in the database, making the JSON more readable and maintainable
2. **Frontend Compatibility**: The frontend continues to work with field IDs without any changes required
3. **Data Migration Compatibility**: Aligns with the original migration script expectations
4. **Backward Compatibility**: Handles legacy `field_X` format for existing data
5. **Error Handling**: Provides warnings for unknown field names and graceful fallbacks

## Testing Recommendations

1. **Save Test**: Create a new medical report and save test group values to verify field names are stored in JSON
2. **Retrieve Test**: Load an existing medical report to verify field IDs are returned to frontend
3. **Migration Test**: Run the data migration script to ensure existing data is properly converted
4. **Edge Case Test**: Test with missing or deleted fields to verify fallback behavior

## Files Modified

- `server/routes/medical_reports.js`: Updated save and retrieve functions
- `server/FIX_SUMMARY.md`: This documentation file

## Next Steps

1. Test the implementation with actual data
2. Monitor logs for any field name warnings
3. Consider running the data migration script if not already done
4. Update any existing test data that may have field IDs as keys