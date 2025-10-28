const { Sequelize } = require('sequelize');
const db = require('../models');

async function debugApiValues() {
  try {
    console.log('=== Debugging API Values Issue ===\n');
    
    // Get test group 2 specifically (from the user's logs)
    const testGroup = await db.test_group.findOne({
      where: { id: 2 },
      include: [
        {
          model: db.tg_fields,
          as: 'tg_fields'
        }
      ]
    });
    
    if (!testGroup) {
      console.log('Test group 2 not found');
      return;
    }
    
    console.log(`Test Group: ${testGroup.name} (ID: ${testGroup.id})`);
    
    // Create field name to ID mapping
    const fieldNameToIdMap = {};
    testGroup.tg_fields.forEach(field => {
      fieldNameToIdMap[field.name] = field.id.toString();
      console.log(`Field: ${field.name} -> ID: ${field.id}`);
    });
    
    // Get all results for this test group
    const groupResults = await db.test_group_result.findAll({
      where: {
        test_group_id: testGroup.id
      }
    });
    
    console.log(`\nFound ${groupResults.length} results for test group ${testGroup.id}`);
    
    const valueMap = {};
    
    groupResults.forEach((tgr, index) => {
      console.log(`\n--- Processing Result ${index + 1} ---`);
      console.log(`Component ID: ${tgr.tg_component_id}`);
      console.log(`Raw result_json: "${tgr.result_json}"`);
      console.log(`Type: ${typeof tgr.result_json}`);
      
      let resultJson = tgr.result_json;
      
      // Parse JSON string if needed
      if (typeof resultJson === 'string') {
        try {
          resultJson = JSON.parse(resultJson);
          console.log(`Parsed JSON:`, resultJson);
        } catch (parseError) {
          console.error(`Failed to parse JSON:`, parseError.message);
          resultJson = null;
        }
      }
      
      if (resultJson && typeof resultJson === 'object') {
        const componentValues = {};
        
        console.log('Processing fields:');
        Object.entries(resultJson).forEach(([fieldName, value]) => {
          const fieldId = fieldNameToIdMap[fieldName];
          console.log(`  Field: "${fieldName}" -> ID: "${fieldId}" -> Value: "${value}" (type: ${typeof value})`);
          
          // Check our filtering condition
          const isValueValid = value !== null && value !== undefined && value.toString().trim() !== '';
          console.log(`  Is value valid? ${isValueValid}`);
          
          if (isValueValid) {
            if (fieldId) {
              componentValues[fieldId] = value;
              console.log(`  ✓ Added: ${fieldId} = "${value}"`);
            } else {
              console.log(`  ✗ No field ID found for "${fieldName}"`);
            }
          } else {
            console.log(`  ✗ Skipped empty value`);
          }
        });
        
        console.log(`Component values for ${tgr.tg_component_id}:`, componentValues);
        
        // Check if we should add to valueMap
        if (Object.keys(componentValues).length > 0) {
          valueMap[tgr.tg_component_id] = componentValues;
          console.log(`✓ Added to valueMap`);
        } else {
          console.log(`✗ Not added to valueMap (no valid values)`);
        }
      } else {
        console.log('No valid JSON object to process');
      }
    });
    
    console.log('\n=== FINAL RESULT ===');
    console.log('ValueMap:', JSON.stringify(valueMap, null, 2));
    console.log('ValueMap has values:', Object.keys(valueMap).length > 0);
    
    // Show what the API would return
    const apiResponse = {
      id: testGroup.id,
      name: testGroup.name,
      values: valueMap
    };
    
    console.log('\nAPI Response would be:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    await db.sequelize.close();
  }
}

debugApiValues();