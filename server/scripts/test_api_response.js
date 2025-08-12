const { Sequelize } = require('sequelize');
const db = require('../models');

async function testApiResponse() {
  try {
    console.log('Testing saved test group results...');
    
    // Get all test group results
    const results = await db.test_group_result.findAll({
      limit: 10
    });
    
    console.log(`Found ${results.length} test group results`);
    
    if (results.length > 0) {
      console.log('\nSample results:');
      results.forEach((result, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log(`- Medical Report ID: ${result.medical_report_id}`);
        console.log(`- Test Group ID: ${result.test_group_id}`);
        console.log(`- Component ID: ${result.tg_component_id}`);
        console.log(`- Result JSON: ${result.result_json}`);
        
        // Try to parse the JSON
        try {
          const parsed = JSON.parse(result.result_json);
          console.log(`- Parsed values:`);
          Object.entries(parsed).forEach(([key, value]) => {
            console.log(`  ${key}: "${value}"`);
          });
        } catch (e) {
          console.log(`- JSON parse error: ${e.message}`);
        }
      });
    }
    
    // Now test the field mapping for a specific test group
    console.log('\n=== Testing Field Mapping ===');
    
    const testGroup = await db.test_group.findOne({
      where: { id: 2 }, // Assuming test group 2 exists
      include: [
        {
          model: db.tg_fields,
          as: 'tg_fields'
        }
      ]
    });
    
    if (testGroup) {
      console.log(`\nTest Group: ${testGroup.name} (ID: ${testGroup.id})`);
      console.log('Fields:');
      
      const fieldNameToIdMap = {};
      testGroup.tg_fields.forEach(field => {
        fieldNameToIdMap[field.name] = field.id.toString();
        console.log(`- ${field.name} (ID: ${field.id})`);
      });
      
      console.log('\nField name to ID mapping:');
      console.log(fieldNameToIdMap);
      
      // Test the value mapping for this group
      const groupResults = await db.test_group_result.findAll({
        where: {
          test_group_id: testGroup.id
        }
      });
      
      console.log(`\nFound ${groupResults.length} results for this test group`);
      
      const valueMap = {};
      groupResults.forEach((tgr) => {
        let resultJson = tgr.result_json;
        
        if (typeof resultJson === 'string') {
          try {
            resultJson = JSON.parse(resultJson);
          } catch (parseError) {
            console.error(`Failed to parse JSON for component ${tgr.tg_component_id}:`, parseError.message);
            resultJson = null;
          }
        }
        
        if (resultJson && typeof resultJson === 'object') {
          const componentValues = {};
          
          Object.entries(resultJson).forEach(([fieldName, value]) => {
            const fieldId = fieldNameToIdMap[fieldName];
            console.log(`Converting field '${fieldName}' -> ID '${fieldId}' with value: "${value}"`);
            
            if (fieldId && value !== null && value !== undefined && value.toString().trim() !== '') {
              componentValues[fieldId] = value;
            }
          });
          
          if (Object.keys(componentValues).length > 0) {
            valueMap[tgr.tg_component_id] = componentValues;
          }
        }
      });
      
      console.log('\nFinal value map:');
      console.log(JSON.stringify(valueMap, null, 2));
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await db.sequelize.close();
  }
}

testApiResponse();