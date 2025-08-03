const { sequelize } = require('../models');
const db = require('../models');

async function testInvoiceCreation() {
  try {
    console.log('=== Testing Invoice Creation with Multiple Test Groups ===');
    
    // First, let's check what happens when we create an invoice with multiple test groups
    const transaction = await sequelize.transaction();
    
    try {
      // Simulate the test_groups array that would come from frontend
      const test_groups = [2, 3]; // Both CBC and Urine Analysis
      console.log('Input test_groups:', test_groups);
      
      // Deduplicate test groups (same as in invoices.js)
      const uniqueTestGroups = [...new Set(test_groups)];
      console.log('Deduplicated uniqueTestGroups:', uniqueTestGroups);
      
      // Check if test groups exist
      for (const tgId of uniqueTestGroups) {
        const testGroup = await db.test_group.findByPk(parseInt(tgId), { transaction });
        console.log(`Test group ${tgId}:`, testGroup ? `${testGroup.name} (price: ${testGroup.price})` : 'NOT FOUND');
      }
      
      // Simulate creating bill_has_tg entries
      console.log('\n=== Simulating bill_has_tg creation ===');
      const billId = 999; // Fake bill ID for testing
      
      for (const tgId of uniqueTestGroups) {
        console.log(`Would create bill_has_tg: bill_id=${billId}, tg_id=${tgId}`);
      }
      
      // Simulate creating medical_report_has_tg entries
      console.log('\n=== Simulating medical_report_has_tg creation ===');
      const medicalReportId = 999; // Fake medical report ID for testing
      
      const testGroupAssociations = uniqueTestGroups.map(tgId => {
        const tgIdNum = parseInt(tgId);
        return {
          medical_report_id: medicalReportId,
          test_group_id: tgIdNum,
          value: null
        };
      });
      
      console.log('Test group associations to create:', JSON.stringify(testGroupAssociations, null, 2));
      
      await transaction.rollback(); // Don't actually create anything
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    // Now let's check the actual data in the database
    console.log('\n=== Checking actual database data ===');
    
    // Find a bill that has multiple test groups
    const [billsWithMultipleTestGroups] = await sequelize.query(`
      SELECT bill_id, COUNT(*) as test_group_count
      FROM bill_has_tg 
      GROUP BY bill_id 
      HAVING COUNT(*) > 1
      ORDER BY bill_id DESC
      LIMIT 1
    `);
    
    if (billsWithMultipleTestGroups.length > 0) {
      const billId = billsWithMultipleTestGroups[0].bill_id;
      console.log(`Found bill ${billId} with ${billsWithMultipleTestGroups[0].test_group_count} test groups`);
      
      // Get the test groups for this bill
      const [billTestGroups] = await sequelize.query(`
        SELECT * FROM bill_has_tg WHERE bill_id = ${billId}
      `);
      console.log('Bill test groups:', billTestGroups);
      
      // Get the medical report for this bill
      const [medicalReports] = await sequelize.query(`
        SELECT id FROM medical_report WHERE bill_id = ${billId}
      `);
      
      if (medicalReports.length > 0) {
        const medicalReportId = medicalReports[0].id;
        console.log(`Medical report ID: ${medicalReportId}`);
        
        // Get the test groups for this medical report
        const [medicalReportTestGroups] = await sequelize.query(`
          SELECT * FROM medical_report_has_tg WHERE medical_report_id = ${medicalReportId}
        `);
        console.log('Medical report test groups:', medicalReportTestGroups);
        
        // Compare the counts
        console.log(`\nComparison:`);
        console.log(`Bill has ${billTestGroups.length} test groups`);
        console.log(`Medical report has ${medicalReportTestGroups.length} test groups`);
        
        if (billTestGroups.length !== medicalReportTestGroups.length) {
          console.log('❌ MISMATCH: Medical report should have the same number of test groups as the bill!');
        } else {
          console.log('✅ Counts match');
        }
      } else {
        console.log('No medical report found for this bill');
      }
    } else {
      console.log('No bills with multiple test groups found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testInvoiceCreation();