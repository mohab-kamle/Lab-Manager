const db = require('../models');

async function debugFieldMapping() {
  try {
    console.log('=== Debugging Field Mapping for Test Group 2 ===\n');
    
    // Get all fields for test group 2
    const testGroupFields = await db.tg_fields.findAll({
      where: {
        test_group_id: 2,
        deleted_at: null
      },
      attributes: ['id', 'name']
    });
    
    console.log(`Found ${testGroupFields.length} fields for test group 2:`);
    testGroupFields.forEach(field => {
      console.log(`  Field ID: ${field.id}, Name: '${field.name}'`);
    });
    
    // Create field name to ID mapping
    const fieldNameToIdMap = {};
    testGroupFields.forEach(field => {
      fieldNameToIdMap[field.name] = field.id.toString();
    });
    
    console.log('\nField name to ID mapping:');
    console.log(fieldNameToIdMap);
    
    // Check the saved test group result
    const savedResult = await db.test_group_result.findOne({
      where: {
        medical_report_id: 10,
        test_group_id: 2,
        tg_component_id: 1
      },
      attributes: ['result_json']
    });
    
    if (savedResult) {
      console.log('\nSaved result JSON:');
      console.log(savedResult.result_json);
      console.log('Type:', typeof savedResult.result_json);
      
      if (savedResult.result_json && typeof savedResult.result_json === 'object') {
        console.log('\nField mapping conversion:');
        Object.entries(savedResult.result_json).forEach(([fieldName, value]) => {
          const fieldId = fieldNameToIdMap[fieldName];
          console.log(`  '${fieldName}' -> Field ID '${fieldId}' (value: '${value}')`);
        });
      }
    } else {
      console.log('\nNo saved result found for medical report 10, test group 2, component 1');
    }
    
  } catch (error) {
    console.error('Error debugging field mapping:', error);
  } finally {
    process.exit(0);
  }
}

debugFieldMapping();