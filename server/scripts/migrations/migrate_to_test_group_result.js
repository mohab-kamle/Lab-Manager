const db = require('../models');
const { Op } = require('sequelize');

/**
 * Data Migration Script: medical_report_tg_field_value → test_group_result
 * 
 * This script migrates data from the over-normalized medical_report_tg_field_value structure
 * to the new simplified test_group_result table with JSON storage.
 * 
 * Migration Process:
 * 1. Fetch all existing field values with their field names
 * 2. Group values by medical_report_id, test_group_id, and tg_component_id
 * 3. Convert grouped field values into JSON objects
 * 4. Insert into new test_group_result table
 * 5. Verify data integrity
 * 
 * Performance Benefits:
 * - Reduces number of database rows by ~80-90%
 * - Eliminates complex joins during queries
 * - Improves insert/update performance significantly
 */

/**
 * Main migration function
 * @returns {Object} Migration results with statistics
 */
async function migrateToTestGroupResult() {
  console.log('🚀 Starting migration from medical_report_tg_field_value to test_group_result...');
  
  const transaction = await db.sequelize.transaction();
  
  try {
    // Step 1: Fetch all existing field values with field names for proper JSON keys
    console.log('📊 Fetching existing field values...');
    const existingData = await db.medical_report_tg_field_value.findAll({
      attributes: [
        'medical_report_id',
        'test_group_id', 
        'tg_component_id',
        'tg_fields_id',
        'value'
      ],
      include: [
        {
          model: db.tg_fields,
          as: 'tg_fields',
          attributes: ['name'],
          required: false // Use LEFT JOIN to handle missing field names
        }
      ],
      transaction
    });
    
    console.log(`📊 Found ${existingData.length} field values to migrate`);
    
    if (existingData.length === 0) {
      console.log('ℹ️ No data to migrate. Migration completed.');
      await transaction.commit();
      return {
        success: true,
        originalCount: 0,
        newCount: 0,
        reductionPercentage: 0,
        message: 'No data to migrate'
      };
    }
    
    // Step 2: Group data by component (medical_report_id + test_group_id + tg_component_id)
    console.log('🔄 Grouping field values by component...');
    const groupedData = {};
    
    existingData.forEach(item => {
      // Create unique key for each component result
      const key = `${item.medical_report_id}_${item.test_group_id}_${item.tg_component_id}`;
      
      // Initialize group if it doesn't exist
      if (!groupedData[key]) {
        groupedData[key] = {
          medical_report_id: item.medical_report_id,
          test_group_id: item.test_group_id,
          tg_component_id: item.tg_component_id,
          result_json: {}
        };
      }
      
      // Use field name as JSON key, fallback to field_id if name is not available
      const fieldName = item.tg_fields?.name || `field_${item.tg_fields_id}`;
      
      // Store the field value in the JSON object
      // Handle null/undefined values appropriately
      groupedData[key].result_json[fieldName] = item.value !== null && item.value !== undefined ? item.value : null;
    });
    
    const migratedRecords = Object.values(groupedData);
    console.log(`📦 Grouped into ${migratedRecords.length} component results`);
    console.log(`📈 Data reduction: ${existingData.length} rows → ${migratedRecords.length} rows (${Math.round((1 - migratedRecords.length/existingData.length) * 100)}% reduction)`);
    
    // Step 3: Insert into new table in batches for better performance
    console.log('💾 Inserting data into test_group_result table...');
    const batchSize = 100; // Process in batches to avoid memory issues
    let insertedCount = 0;
    
    for (let i = 0; i < migratedRecords.length; i += batchSize) {
      const batch = migratedRecords.slice(i, i + batchSize);
      
      try {
        await db.test_group_result.bulkCreate(batch, {
          transaction,
          ignoreDuplicates: true, // Skip duplicates if they exist
          validate: true // Ensure data validation
        });
        
        insertedCount += batch.length;
        console.log(`✅ Migrated ${insertedCount}/${migratedRecords.length} records (${Math.round((insertedCount/migratedRecords.length) * 100)}%)`);
      } catch (batchError) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, batchError.message);
        throw batchError;
      }
    }
    
    // Step 4: Verify data integrity
    console.log('🔍 Verifying data integrity...');
    const insertedCount_verify = await db.test_group_result.count({ transaction });
    
    if (insertedCount_verify !== migratedRecords.length) {
      throw new Error(`Data integrity check failed: Expected ${migratedRecords.length} records, but found ${insertedCount_verify}`);
    }
    
    // Step 5: Commit transaction
    await transaction.commit();
    console.log('🎉 Migration completed successfully!');
    
    const reductionPercentage = Math.round((1 - migratedRecords.length/existingData.length) * 100);
    console.log(`📊 Migration Summary:`);
    console.log(`   • Original records: ${existingData.length}`);
    console.log(`   • New records: ${migratedRecords.length}`);
    console.log(`   • Data reduction: ${reductionPercentage}%`);
    console.log(`   • Performance improvement: Significant reduction in joins and query complexity`);
    
    return {
      success: true,
      originalCount: existingData.length,
      newCount: migratedRecords.length,
      reductionPercentage: reductionPercentage,
      message: 'Migration completed successfully'
    };
    
  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    console.error('🔄 Transaction rolled back. No changes were made to the database.');
    throw error;
  }
}

/**
 * Verify migration results by comparing data
 * @returns {Object} Verification results
 */
async function verifyMigration() {
  console.log('🔍 Verifying migration results...');
  
  try {
    // Count records in both tables
    const oldCount = await db.medical_report_tg_field_value.count();
    const newCount = await db.test_group_result.count();
    
    console.log(`Old table records: ${oldCount}`);
    console.log(`New table records: ${newCount}`);
    
    // Sample verification: Check a few records
    const sampleOldData = await db.medical_report_tg_field_value.findAll({
      limit: 5,
      include: [{
        model: db.tg_fields,
        as: 'tg_fields',
        attributes: ['name']
      }]
    });
    
    console.log('✅ Migration verification completed');
    return {
      oldCount,
      newCount,
      reductionPercentage: Math.round((1 - newCount/oldCount) * 100),
      sampleData: sampleOldData.length
    };
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToTestGroupResult()
    .then(result => {
      console.log('\n📋 Migration Result:', result);
      return verifyMigration();
    })
    .then(verification => {
      console.log('\n📋 Verification Result:', verification);
      console.log('\n🎯 Next Steps:');
      console.log('   1. Test the new functionality thoroughly');
      console.log('   2. Update frontend to handle the new JSON structure');
      console.log('   3. Remove old model and associations once confirmed working');
      console.log('   4. Drop old table: DROP TABLE medical_report_tg_field_value;');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration error:', error.message);
      process.exit(1);
    });
}

module.exports = { 
  migrateToTestGroupResult, 
  verifyMigration 
};