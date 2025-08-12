const db = require('../models');

async function checkSavedTestGroupValues() {
  try {
    console.log('=== Checking Saved Test Group Values ===\n');
    
    // Check all test_group_result records
    const allResults = await db.test_group_result.findAll({
      attributes: ['id', 'medical_report_id', 'test_group_id', 'tg_component_id', 'result_json'],
      order: [['medical_report_id', 'ASC'], ['test_group_id', 'ASC'], ['tg_component_id', 'ASC']]
    });
    
    console.log(`Found ${allResults.length} test_group_result records:\n`);
    
    allResults.forEach(result => {
      console.log(`Record ID: ${result.id}`);
      console.log(`  Medical Report ID: ${result.medical_report_id}`);
      console.log(`  Test Group ID: ${result.test_group_id}`);
      console.log(`  Component ID: ${result.tg_component_id}`);
      console.log(`  Result JSON: ${JSON.stringify(result.result_json)}`);
      console.log('---');
    });
    
    // Specifically check for medical report 10
    console.log('\n=== Records for Medical Report 10 ===\n');
    const report10Results = await db.test_group_result.findAll({
      where: { medical_report_id: 10 },
      attributes: ['id', 'medical_report_id', 'test_group_id', 'tg_component_id', 'result_json']
    });
    
    if (report10Results.length === 0) {
      console.log('No test_group_result records found for medical report 10');
    } else {
      report10Results.forEach(result => {
        console.log(`Record ID: ${result.id}`);
        console.log(`  Test Group ID: ${result.test_group_id}`);
        console.log(`  Component ID: ${result.tg_component_id}`);
        console.log(`  Result JSON: ${JSON.stringify(result.result_json)}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error checking saved test group values:', error);
  } finally {
    process.exit(0);
  }
}

checkSavedTestGroupValues();