const { Sequelize } = require('sequelize');
const db = require('../models');

async function cleanupEmptyTestGroupResults() {
  try {
    console.log('Starting cleanup of empty test group results...');
    
    // Find all test group results with empty or null result_json
    const emptyResults = await db.test_group_result.findAll({
      where: {
        [Sequelize.Op.or]: [
          { result_json: null },
          { result_json: '' },
          { result_json: '{}' }
        ]
      }
    });
    
    console.log(`Found ${emptyResults.length} empty test group results`);
    
    if (emptyResults.length > 0) {
      // Delete empty results
      const deleteCount = await db.test_group_result.destroy({
        where: {
          [Sequelize.Op.or]: [
            { result_json: null },
            { result_json: '' },
            { result_json: '{}' }
          ]
        }
      });
      
      console.log(`Deleted ${deleteCount} empty test group results`);
    }
    
    // Also find and delete results where all field values are empty strings
    const allResults = await db.test_group_result.findAll();
    let deletedCount = 0;
    
    for (const result of allResults) {
      try {
        let resultJson;
        if (typeof result.result_json === 'string') {
          resultJson = JSON.parse(result.result_json);
        } else {
          resultJson = result.result_json;
        }
        
        // Check if all values are empty strings or null
        const values = Object.values(resultJson || {});
        const hasNonEmptyValue = values.some(value => 
          value !== null && value !== undefined && value.toString().trim() !== ''
        );
        
        if (!hasNonEmptyValue && values.length > 0) {
          await result.destroy();
          deletedCount++;
          console.log(`Deleted result with ID ${result.id} - all values were empty`);
        }
      } catch (parseError) {
        console.log(`Error parsing result_json for ID ${result.id}:`, parseError.message);
      }
    }
    
    console.log(`Deleted ${deletedCount} additional results with empty field values`);
    console.log('Cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await db.sequelize.close();
  }
}

cleanupEmptyTestGroupResults();