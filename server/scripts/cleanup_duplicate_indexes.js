const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

const sequelize = new Sequelize(config.development);

async function cleanupDuplicateIndexes() {
  try {
    console.log('🔧 Starting duplicate index cleanup...');
    
    // Get all indexes on the lab table
    const [indexes] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'labmanager' 
      AND TABLE_NAME = 'lab'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log('📊 Current indexes on lab table:');
    indexes.forEach(index => {
      console.log(`  - ${index.INDEX_NAME}: ${index.COLUMN_NAME} (unique: ${!index.NON_UNIQUE})`);
    });
    
    // Remove all duplicate indexes (keep only the first one of each type)
    const indexesToKeep = ['PRIMARY', 'subdomain', 'tenant_id', 'owner_id', 'idx_lab_subdomain', 'idx_lab_tenant'];
    const indexesToRemove = [];
    
    // Find duplicate indexes
    const seenIndexes = new Set();
    indexes.forEach(index => {
      if (!indexesToKeep.includes(index.INDEX_NAME)) {
        // Check if this is a duplicate of a base index
        const baseName = index.INDEX_NAME.replace(/_\d+$/, ''); // Remove _2, _3, etc.
        if (seenIndexes.has(baseName)) {
          indexesToRemove.push(index.INDEX_NAME);
        } else {
          seenIndexes.add(baseName);
        }
      }
    });
    
    console.log(`🗑️  Found ${indexesToRemove.length} duplicate indexes to remove:`);
    indexesToRemove.forEach(index => console.log(`  - ${index}`));
    
    // Remove duplicate indexes
    for (const indexName of indexesToRemove) {
      try {
        console.log(`🗑️  Removing duplicate index: ${indexName}`);
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`lab\``);
        console.log(`✅ Removed index: ${indexName}`);
      } catch (error) {
        console.log(`⚠️  Could not remove index ${indexName}: ${error.message}`);
      }
    }
    
    // Verify remaining indexes
    const [remainingIndexes] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'labmanager' 
      AND TABLE_NAME = 'lab'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log('📊 Remaining indexes on lab table:');
    remainingIndexes.forEach(index => {
      console.log(`  - ${index.INDEX_NAME}: ${index.COLUMN_NAME} (unique: ${!index.NON_UNIQUE})`);
    });
    
    console.log(`✅ Cleanup completed! Removed ${indexesToRemove.length} duplicate indexes.`);
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
cleanupDuplicateIndexes(); 