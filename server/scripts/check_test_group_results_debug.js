const db = require('../models');

async function checkTestGroupResultsDebug() {
  try {
    console.log('=== Checking Test Group Results Debug ===\n');
    
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
      console.log(`  Result JSON:`, result.result_json);
      console.log(`  Result JSON type:`, typeof result.result_json);
      if (result.result_json && typeof result.result_json === 'object') {
        console.log(`  Result JSON keys:`, Object.keys(result.result_json));
        console.log(`  Result JSON values:`, Object.values(result.result_json));
      }
      console.log('---');
    });
    
    // Check for the specific medical report that has saved values
    console.log('\n=== Looking for Medical Reports with Test Group Results ===\n');
    const reportsWithResults = await db.medical_report.findAll({
      include: [{
        model: db.test_group_result,
        as: 'test_group_results',
        required: true
      }],
      attributes: ['id', 'patient_name']
    });
    
    console.log(`Found ${reportsWithResults.length} medical reports with test group results:`);
    reportsWithResults.forEach(report => {
      console.log(`Report ID: ${report.id}, Patient: ${report.patient_name}`);
      console.log(`  Has ${report.test_group_results.length} test group results`);
    });
    
  } catch (error) {
    console.error('Error checking test group results:', error);
  } finally {
    process.exit(0);
  }
}

checkTestGroupResultsDebug();