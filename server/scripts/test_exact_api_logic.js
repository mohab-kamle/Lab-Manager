const { Sequelize } = require('sequelize');
const db = require('../models');

async function testExactApiLogic() {
  try {
    console.log('=== Testing Exact API Logic ===\n');
    
    const medicalReportId = 8; // Using a valid ID that has data
    
    // First get all test groups associated with this medical report through the junction table
    // Include soft-deleted test groups for existing medical reports to preserve data
    const reportTestGroups = await db.medical_report_has_tg.findAll({
      where: { medical_report_id: medicalReportId },
      attributes: ["medical_report_id", "test_group_id", "value"],
      include: [
        {
          model: db.test_group,
          as: "test_group",
          required: false, // Make this a LEFT JOIN
          paranoid: false, // Include soft-deleted test groups
          attributes: ["id", "name", "price", "deleted_at"],
          include: [
            {
              model: db.tg_component,
              as: "tg_components",
              required: false,
              paranoid: false,
              attributes: ["id", "test_group_id", "test_category_id", "name"],
            },
            {
              model: db.tgc_category,
              as: "tgc_categories",
              required: false,
              paranoid: false,
              attributes: ["id", "name", "test_group_id"],
              include: [
                {
                  model: db.tg_component,
                  as: "tg_components",
                  required: false,
                  paranoid: false,
                  attributes: [
                    "id",
                    "test_group_id",
                    "test_category_id",
                    "name",
                  ],
                },
              ],
            },
            {
              model: db.tg_fields,
              as: "tg_fields",
              required: false,
              paranoid: false,
              attributes: ["id", "name", "test_group_id"],
            },
            {
              model: db.field_comp_options,
              as: "field_comp_options",
              required: false,
              paranoid: false,
              attributes: [
                "id",
                "name",
                "tg_component_id",
                "tg_fields_id",
                "test_group_id",
              ],
            },
          ],
        },
      ],
    });

    console.log(`Found ${reportTestGroups.length} test groups for medical report ${medicalReportId}`);

    // Get all test group results for this medical report using the new JSON structure
    const testGroupResults = await db.test_group_result.findAll({
      where: { medical_report_id: medicalReportId },
      attributes: ["id", "test_group_id", "tg_component_id", "result_json"],
    });
    
    console.log(`Found ${testGroupResults.length} test group results for medical report ${medicalReportId}:`);
    testGroupResults.forEach((tgr, index) => {
      console.log(`  Result ${index + 1}:`, {
        id: tgr.id,
        test_group_id: tgr.test_group_id,
        tg_component_id: tgr.tg_component_id,
        result_json: tgr.result_json,
        result_json_type: typeof tgr.result_json
      });
    });

    // Format the response - EXACT API LOGIC
    const testGroups = reportTestGroups
      .filter((rtg) => rtg.test_group) // Only include entries where test_group exists
      .map((rtg) => {
        const group = rtg.test_group;

        console.log(`\n=== Processing test group ${group.id} (${group.name}) ===`);
        
        // Create a map of field name to field ID for this test group
        const fieldNameToIdMap = {};
        (group.tg_fields || []).forEach(field => {
          fieldNameToIdMap[field.name] = field.id; // Keep as number for frontend compatibility
        });
        
        console.log(`Field name to ID mapping:`, fieldNameToIdMap);

        // Create a map of component_id -> field_id -> value from JSON results
        const valueMap = {};
        const groupResults = testGroupResults.filter((tgr) => tgr.test_group_id === group.id);
        
        console.log(`Found ${groupResults.length} results for this group`);
        
        groupResults.forEach((tgr) => {
          console.log(`\nProcessing result for component ${tgr.tg_component_id}:`, {
            result_json: tgr.result_json,
            result_json_type: typeof tgr.result_json
          });
          
          // Extract field values from JSON and convert field names back to field IDs
          let resultJson = tgr.result_json;
          
          // Parse JSON string if needed
          if (typeof resultJson === 'string') {
            try {
              resultJson = JSON.parse(resultJson);
              console.log(`  Parsed JSON string for component ${tgr.tg_component_id}:`, resultJson);
            } catch (parseError) {
              console.error(`  Failed to parse JSON for component ${tgr.tg_component_id}:`, parseError.message);
              resultJson = null;
            }
          }
          
          if (resultJson && typeof resultJson === 'object') {
            const componentValues = {};
            
            // Convert field names back to field IDs for frontend compatibility
            Object.entries(resultJson).forEach(([fieldName, value]) => {
              const fieldId = fieldNameToIdMap[fieldName];
              console.log(`  Converting field '${fieldName}' -> ID '${fieldId}' with value:`, value);
              
              // Only include non-empty values
              if (value !== null && value !== undefined && value.toString().trim() !== '') {
                if (fieldId) {
                  componentValues[fieldId] = value;
                  console.log(`    ✓ Added: ${fieldId} = "${value}"`);
                } else {
                  // Handle legacy field_X format or unknown fields
                  const legacyMatch = fieldName.match(/^field_(\d+)$/);
                  if (legacyMatch) {
                    componentValues[legacyMatch[1]] = value;
                    console.log(`    ✓ Using legacy format: field_${legacyMatch[1]} = ${value}`);
                  } else {
                    console.warn(`    ✗ Unknown field name: ${fieldName} for test group ${group.id}`);
                  }
                }
              } else {
                console.log(`    ✗ Skipped empty value for field '${fieldName}'`);
              }
            });
            
            console.log(`  Component values for ${tgr.tg_component_id}:`, componentValues);
            
            // Only add to valueMap if there are actual values
            if (Object.keys(componentValues).length > 0) {
              valueMap[tgr.tg_component_id] = componentValues;
              console.log(`  ✓ Added component ${tgr.tg_component_id} to valueMap`);
            } else {
              console.log(`  ✗ Component ${tgr.tg_component_id} has no values to store`);
            }
          } else {
            console.log(`  No valid JSON object to process for component ${tgr.tg_component_id}`);
          }
        });
        
        console.log(`\nFinal valueMap for group ${group.id}:`, valueMap);
        
        // Build the response object for this test group
        const testGroupResponse = {
          id: group.id,
          name: group.name,
          directComponents: (group.tg_components || []).map((comp) => ({
            id: comp.id,
            name: comp.name,
            test_category_id: comp.test_category_id,
          })),
          categories: (group.tgc_categories || []).map((cat) => ({
            id: cat.id,
            name: cat.name,
          })),
          fields: (group.tg_fields || []).map((field) => ({
            id: field.id,
            name: field.name,
          })),
          values: valueMap,
          test_group_results: [], // This would be populated differently
        };
        
        console.log(`\nTest group response:`, JSON.stringify(testGroupResponse, null, 2));
        
        return testGroupResponse;
      });

    console.log('\n=== FINAL API RESPONSE ===');
    console.log(JSON.stringify(testGroups, null, 2));
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await db.sequelize.close();
  }
}

testExactApiLogic();