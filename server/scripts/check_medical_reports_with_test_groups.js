const db = require('../models');

async function checkMedicalReportsWithTestGroups() {
  try {
    console.log('Checking medical reports and their test groups...');
    
    // Get all medical reports
    const reports = await db.medical_report.findAll({
      attributes: ['id', 'patient_id', 'date'],
      limit: 10,
      order: [['id', 'ASC']]
    });
    
    console.log(`\nFound ${reports.length} medical reports:`);
    
    for (const report of reports) {
      console.log(`\nMedical Report ${report.id} (Patient: ${report.patient_id}, Date: ${report.date})`);
      
      // Check if this report has any test groups
      const reportTestGroups = await db.medical_report_has_tg.findAll({
        where: { medical_report_id: report.id },
        include: [
          {
            model: db.test_group,
            as: 'test_group',
            attributes: ['id', 'name']
          }
        ]
      });
      
      if (reportTestGroups.length > 0) {
        console.log(`  Has ${reportTestGroups.length} test groups:`);
        reportTestGroups.forEach(rtg => {
          if (rtg.test_group) {
            console.log(`    - Test Group ${rtg.test_group.id}: ${rtg.test_group.name}`);
          }
        });
      } else {
        console.log('  No test groups associated');
      }
    }
    
    // Also check what test groups exist in general
    console.log('\n=== Available Test Groups ===');
    const allTestGroups = await db.test_group.findAll({
      attributes: ['id', 'name'],
      limit: 10
    });
    
    console.log(`Found ${allTestGroups.length} test groups in total:`);
    allTestGroups.forEach(tg => {
      console.log(`  - Test Group ${tg.id}: ${tg.name}`);
    });
    
  } catch (error) {
    console.error('Error checking medical reports:', error);
  } finally {
    process.exit(0);
  }
}

checkMedicalReportsWithTestGroups();