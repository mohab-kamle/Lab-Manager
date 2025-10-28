const db = require('../models');

async function debugTestGroupResults() {
  try {
    console.log('=== Debugging Test Group Results Issue ===\n');
    
    // Check if there are any test_group_result records at all
    const allResults = await db.test_group_result.findAll({
      limit: 5,
      attributes: ['id', 'medical_report_id', 'test_group_id', 'tg_component_id', 'result_json']
    });
    
    console.log(`Found ${allResults.length} test_group_result records in total`);
    if (allResults.length > 0) {
      console.log('Sample records:');
      allResults.forEach((result, index) => {
        console.log(`  ${index + 1}. Medical Report: ${result.medical_report_id}, Test Group: ${result.test_group_id}, Component: ${result.tg_component_id}`);
        console.log(`     Result JSON: ${JSON.stringify(result.result_json)}`);
      });
    } else {
      console.log('❌ No test_group_result records found in database!');
    }
    
    // Check medical reports that have test groups
    console.log('\n=== Medical Reports with Test Groups ===');
    const reportsWithTestGroups = await db.medical_report_has_tg.findAll({
      limit: 10,
      include: [
        {
          model: db.medical_report,
          as: 'medical_report',
          attributes: ['id', 'patient_id']
        },
        {
          model: db.test_group,
          as: 'test_group',
          attributes: ['id', 'name']
        }
      ]
    });
    
    console.log(`Found ${reportsWithTestGroups.length} medical report - test group associations`);
    reportsWithTestGroups.forEach((assoc, index) => {
      console.log(`  ${index + 1}. Medical Report ${assoc.medical_report_id} has Test Group ${assoc.test_group_id} (${assoc.test_group?.name})`);
    });
    
    // Check if there are any test groups with components and fields
    console.log('\n=== Test Groups Structure ===');
    const testGroups = await db.test_group.findAll({
      limit: 3,
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
    });
    
    testGroups.forEach(tg => {
      console.log(`Test Group ${tg.id}: ${tg.name}`);
      console.log(`  Components: ${tg.tg_components?.length || 0}`);
      console.log(`  Fields: ${tg.tg_fields?.length || 0}`);
      if (tg.tg_components?.length > 0) {
        tg.tg_components.forEach(comp => {
          console.log(`    - Component ${comp.id}: ${comp.name}`);
        });
      }
      if (tg.tg_fields?.length > 0) {
        tg.tg_fields.forEach(field => {
          console.log(`    - Field ${field.id}: ${field.name}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error debugging test group results:', error);
  } finally {
    process.exit(0);
  }
}

debugTestGroupResults();