const { Sequelize } = require('sequelize');
const db = require('../models');

async function testApiEndpoint() {
  try {
    console.log('=== Testing API Endpoint Logic ===\n');
    
    const medicalReportId = 13; // From debug output
    
    // Simulate the exact API query
    const report = await db.medical_report.findByPk(medicalReportId, {
      attributes: [
        "id",
        "lab_id",
        "branch_id",
        "registered_at",
        "collected_at",
        "received_at",
        "reported_at",
        "comment",
        "signatory_name",
        "signatory_id",
        "signatory_admin_id",
      ],
      include: [
        {
          model: db.patient,
          as: "patient",
          attributes: ["id", "name", "patientcode", "birth_date", "gender"],
          include: [
            {
              model: db.referral,
              as: "referral",
              attributes: [
                "id",
                "doctor_name",
                "specialization",
                "phone",
                "email",
              ],
            },
          ],
        },
        {
          // New simplified test group results structure using JSON storage
          model: db.test_group_result,
          as: "test_group_results",
          attributes: ["id", "result_json"],
          include: [
            {
              model: db.test_group,
              as: "test_group",
              attributes: ["id", "name", "price"],
              include: [
                {
                  model: db.tg_fields,
                  as: "tg_fields",
                  attributes: ["id", "name", "test_group_id"],
                },
              ],
            },
            {
              model: db.tg_component,
              as: "tg_component",
              attributes: ["id", "name", "reference_range", "result_type"],
              include: [
                {
                  model: db.tgc_category,
                  required: false,
                  as: "category",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });
    
    if (!report) {
      console.log(`❌ Medical report ${medicalReportId} not found`);
      return;
    }
    
    console.log(`✅ Found medical report ${report.id}`);
    console.log(`Patient: ${report.patient?.name || 'Unknown'}`);
    console.log(`Test Group Results Count: ${report.test_group_results?.length || 0}`);
    
    if (report.test_group_results && report.test_group_results.length > 0) {
      console.log('\n=== Test Group Results ===');
      report.test_group_results.forEach((result, index) => {
        console.log(`\n${index + 1}. Result ID: ${result.id}`);
        console.log(`   Result JSON: ${result.result_json}`);
        console.log(`   Test Group: ${result.test_group?.name || 'Not loaded'} (ID: ${result.test_group?.id || 'N/A'})`);
        console.log(`   Component: ${result.tg_component?.name || 'Not loaded'} (ID: ${result.tg_component?.id || 'N/A'})`);
        
        if (result.test_group?.tg_fields) {
          console.log(`   Fields (${result.test_group.tg_fields.length}):`);
          result.test_group.tg_fields.forEach(field => {
            console.log(`     - ${field.name} (ID: ${field.id})`);
          });
        }
      });
    } else {
      console.log('\n❌ No test group results found in API response!');
      
      // Let's check if the association is working
      console.log('\n=== Direct Association Test ===');
      const directResults = await db.test_group_result.findAll({
        where: { medical_report_id: medicalReportId },
        include: [
          {
            model: db.test_group,
            as: "test_group",
            attributes: ["id", "name"]
          },
          {
            model: db.tg_component,
            as: "tg_component",
            attributes: ["id", "name"]
          }
        ]
      });
      
      console.log(`Direct query found ${directResults.length} results`);
      directResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ID: ${result.id}, Test Group: ${result.test_group?.name}, Component: ${result.tg_component?.name}`);
      });
    }
    
    // Add count calculations for consistency with list endpoint
    const reportData = report.get({ plain: true });
    const enrichedReport = {
      ...reportData,
      tests_count: reportData.tests?.length || 0,
      cultures_count: reportData.medical_report_has_cultures?.length || 0,
      test_groups_count: reportData.test_group_results?.length || 0,
    };
    
    console.log('\n=== Final API Response Structure ===');
    console.log(`Tests Count: ${enrichedReport.tests_count}`);
    console.log(`Cultures Count: ${enrichedReport.cultures_count}`);
    console.log(`Test Groups Count: ${enrichedReport.test_groups_count}`);
    
  } catch (error) {
    console.error('❌ Error during API test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await db.sequelize.close();
  }
}

testApiEndpoint();