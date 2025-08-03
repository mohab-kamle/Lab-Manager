const { sequelize } = require('../models');
const db = require('../models');

async function testMedicalReportTgCreation() {
  try {
    console.log('=== Testing medical_report_has_tg Creation ===');
    
    // Use medical report 14 (which currently only has test group 2)
    const medicalReportId = 14;
    const testGroupsToAdd = [2, 3]; // Both test groups that should be there
    
    console.log(`Testing with medical report ID: ${medicalReportId}`);
    console.log(`Test groups to add: ${testGroupsToAdd}`);
    
    const transaction = await sequelize.transaction();
    
    try {
      // First, check current state
      console.log('\n=== Current State ===');
      const currentAssociations = await db.medical_report_has_tg.findAll({
        where: { medical_report_id: medicalReportId },
        transaction,
        raw: true
      });
      console.log('Current associations:', currentAssociations);
      
      // Clear existing associations
      console.log('\n=== Clearing Existing Associations ===');
      const deletedCount = await db.medical_report_has_tg.destroy({
        where: { medical_report_id: medicalReportId },
        transaction
      });
      console.log(`Deleted ${deletedCount} existing associations`);
      
      // Prepare associations to create
      const testGroupAssociations = testGroupsToAdd.map(tgId => ({
        medical_report_id: medicalReportId,
        test_group_id: parseInt(tgId),
        value: null
      }));
      
      console.log('\n=== Attempting Bulk Create ===');
      console.log('Associations to create:', JSON.stringify(testGroupAssociations, null, 2));
      
      try {
        const createdAssociations = await db.medical_report_has_tg.bulkCreate(
          testGroupAssociations,
          {
            validate: true,
            transaction,
            individualHooks: true,
            ignoreDuplicates: true
          }
        );
        console.log(`✅ Bulk create successful: ${createdAssociations.length} associations created`);
        
      } catch (bulkError) {
        console.error('❌ Bulk create failed:', bulkError.message);
        console.log('\n=== Attempting Individual Creates ===');
        
        for (const association of testGroupAssociations) {
          try {
            const [instance, created] = await db.medical_report_has_tg.findOrCreate({
              where: {
                medical_report_id: association.medical_report_id,
                test_group_id: association.test_group_id
              },
              defaults: {
                medical_report_id: association.medical_report_id,
                test_group_id: association.test_group_id,
                value: null
              },
              transaction
            });
            
            console.log(`Test group ${association.test_group_id}: ${created ? 'CREATED' : 'ALREADY EXISTS'}`);
            
          } catch (individualError) {
            console.error(`❌ Error creating association for test group ${association.test_group_id}:`, individualError.message);
            console.error('Full error:', individualError);
          }
        }
      }
      
      // Verify final state
      console.log('\n=== Final Verification ===');
      const finalAssociations = await db.medical_report_has_tg.findAll({
        where: { medical_report_id: medicalReportId },
        transaction,
        raw: true
      });
      console.log('Final associations:', finalAssociations);
      console.log(`Expected: ${testGroupsToAdd.length}, Actual: ${finalAssociations.length}`);
      
      if (finalAssociations.length === testGroupsToAdd.length) {
        console.log('✅ SUCCESS: All test groups were created');
      } else {
        console.log('❌ FAILURE: Not all test groups were created');
      }
      
      // Rollback to not affect the actual data
      await transaction.rollback();
      console.log('\nTransaction rolled back (no actual changes made)');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    // Also test the table structure
    console.log('\n=== Table Structure Analysis ===');
    const [tableStructure] = await sequelize.query('DESCRIBE medical_report_has_tg');
    console.log('Table structure:', tableStructure);
    
    // Check constraints
    const [constraints] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'medical_report_has_tg'
    `);
    console.log('Constraints:', constraints);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testMedicalReportTgCreation();