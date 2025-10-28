const db = require('../models');

async function createSampleTestGroupResults() {
  try {
    console.log('=== Creating Sample Test Group Results ===\n');
    
    // First, find a medical report that has test groups
    const reportWithTestGroups = await db.medical_report_has_tg.findOne({
      include: [
        {
          model: db.medical_report,
          as: 'medical_report',
          attributes: ['id', 'patient_id']
        },
        {
          model: db.test_group,
          as: 'test_group',
          attributes: ['id', 'name'],
          include: [
            {
              model: db.tg_component,
              as: 'tg_components',
              attributes: ['id', 'name']
            },
            {
              model: db.tg_fields,
              as: 'tg_fields',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    if (!reportWithTestGroups) {
      console.log('❌ No medical reports with test groups found!');
      return;
    }
    
    console.log(`Found medical report ${reportWithTestGroups.medical_report_id} with test group ${reportWithTestGroups.test_group_id} (${reportWithTestGroups.test_group.name})`);
    
    const testGroup = reportWithTestGroups.test_group;
    const medicalReportId = reportWithTestGroups.medical_report_id;
    
    // Create sample results for the first few components
    const componentsToTest = testGroup.tg_components.slice(0, 3); // Take first 3 components
    const fieldsToTest = testGroup.tg_fields.slice(0, 2); // Take first 2 fields
    
    console.log(`Creating results for ${componentsToTest.length} components and ${fieldsToTest.length} fields`);
    
    for (const component of componentsToTest) {
      // Create a result_json object with field names as keys
      const resultJson = {};
      fieldsToTest.forEach((field, index) => {
        resultJson[field.name] = `Sample value ${index + 1} for ${component.name}`;
      });
      
      console.log(`Creating result for component ${component.id} (${component.name}):`, resultJson);
      
      // Create the test_group_result record
      await db.test_group_result.create({
        medical_report_id: medicalReportId,
        test_group_id: testGroup.id,
        tg_component_id: component.id,
        result_json: resultJson
      });
      
      console.log(`✅ Created result for component ${component.id}`);
    }
    
    // Verify the created records
    console.log('\n=== Verification ===');
    const createdResults = await db.test_group_result.findAll({
      where: {
        medical_report_id: medicalReportId,
        test_group_id: testGroup.id
      },
      attributes: ['id', 'medical_report_id', 'test_group_id', 'tg_component_id', 'result_json']
    });
    
    console.log(`Created ${createdResults.length} test group result records:`);
    createdResults.forEach(result => {
      console.log(`  - Component ${result.tg_component_id}: ${JSON.stringify(result.result_json)}`);
    });
    
    console.log(`\n🎉 Sample test group results created for medical report ${medicalReportId}!`);
    console.log(`You can now test the frontend with this medical report.`);
    
  } catch (error) {
    console.error('Error creating sample test group results:', error);
  } finally {
    process.exit(0);
  }
}

createSampleTestGroupResults();