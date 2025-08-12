const db = require('../models');

async function checkTestGroupResults() {
  try {
    console.log('Checking test_group_result table...');
    
    // Check if there are any test group results (without includes first)
    const allResults = await db.test_group_result.findAll({
      limit: 10
    });
    
    console.log(`Found ${allResults.length} test group results in total`);
    
    if (allResults.length > 0) {
      console.log('\nFirst few results:');
      allResults.forEach((result, index) => {
        console.log(`${index + 1}. Medical Report ID: ${result.medical_report_id}, Test Group ID: ${result.test_group_id}, Component ID: ${result.tg_component_id}`);
        console.log(`   Result JSON:`, result.result_json);
        console.log(`   JSON Type:`, typeof result.result_json);
        console.log('---');
      });
    }
    
    // Check specifically for medical report IDs 1, 2, 3
    console.log('\nChecking for specific medical report IDs...');
    for (let reportId = 1; reportId <= 5; reportId++) {
      const results = await db.test_group_result.findAll({
        where: { medical_report_id: reportId }
      });
      
      console.log(`Medical Report ${reportId}: ${results.length} test group results`);
      if (results.length > 0) {
        results.forEach(result => {
          console.log(`  - Test Group ${result.test_group_id}: Component ${result.tg_component_id}`);
          console.log(`    JSON:`, result.result_json);
        });
      }
    }
    
    // Check if there are any medical reports
    console.log('\nChecking medical reports...');
    const reports = await db.medical_report.findAll({
      limit: 5,
      attributes: ['id', 'patient_id']
    });
    
    console.log(`Found ${reports.length} medical reports`);
    reports.forEach(report => {
      console.log(`Medical Report ${report.id}: Patient ${report.patient_id}`);
    });
    
  } catch (error) {
    console.error('Error checking test group results:', error);
  } finally {
    process.exit(0);
  }
}

checkTestGroupResults();