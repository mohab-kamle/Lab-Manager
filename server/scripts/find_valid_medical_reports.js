const { Sequelize } = require('sequelize');
const db = require('../models');

async function findValidMedicalReports() {
  try {
    console.log('=== Finding Valid Medical Reports ===\n');
    
    // Find medical reports that have test groups
    const reportsWithTestGroups = await db.medical_report_has_tg.findAll({
      attributes: ['medical_report_id'],
      group: ['medical_report_id'],
      include: [
        {
          model: db.medical_report,
          as: 'medical_report',
          attributes: ['id', 'lab_id', 'branch_id', 'date', 'patient_id']
        }
      ]
    });
    
    console.log(`Found ${reportsWithTestGroups.length} medical reports with test groups:`);
    reportsWithTestGroups.forEach((report, index) => {
      console.log(`  ${index + 1}. Medical Report ID: ${report.medical_report_id}`);
      if (report.medical_report) {
        console.log(`     Date: ${report.medical_report.date}`);
        console.log(`     Patient ID: ${report.medical_report.patient_id}`);
      }
    });
    
    // Find medical reports that have test group results
    const reportsWithResults = await db.test_group_result.findAll({
      attributes: ['medical_report_id'],
      group: ['medical_report_id']
    });
    
    console.log(`\nFound ${reportsWithResults.length} medical reports with test group results:`);
    reportsWithResults.forEach((result, index) => {
      console.log(`  ${index + 1}. Medical Report ID: ${result.medical_report_id}`);
    });
    
    // Find a specific medical report that has both test groups and results
    if (reportsWithResults.length > 0) {
      const testReportId = reportsWithResults[0].medical_report_id;
      console.log(`\n=== Testing with Medical Report ID: ${testReportId} ===`);
      
      // Get test groups for this report
      const testGroups = await db.medical_report_has_tg.findAll({
        where: { medical_report_id: testReportId },
        include: [
          {
            model: db.test_group,
            as: 'test_group',
            attributes: ['id', 'name']
          }
        ]
      });
      
      console.log(`Test groups for report ${testReportId}:`);
      testGroups.forEach((tg, index) => {
        console.log(`  ${index + 1}. Test Group ID: ${tg.test_group_id} - ${tg.test_group?.name || 'Unknown'}`);
      });
      
      // Get results for this report
      const results = await db.test_group_result.findAll({
        where: { medical_report_id: testReportId },
        attributes: ['id', 'test_group_id', 'tg_component_id', 'result_json']
      });
      
      console.log(`\nTest group results for report ${testReportId}:`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. Result ID: ${result.id}`);
        console.log(`     Test Group ID: ${result.test_group_id}`);
        console.log(`     Component ID: ${result.tg_component_id}`);
        console.log(`     Result JSON: ${result.result_json}`);
      });
    }
    
  } catch (error) {
    console.error('Error during search:', error);
  } finally {
    await db.sequelize.close();
  }
}

findValidMedicalReports();