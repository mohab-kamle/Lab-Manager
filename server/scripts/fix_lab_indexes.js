const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

const sequelize = new Sequelize(config.development);

async function fixLabIndexes() {
  try {
    console.log('🔧 Starting lab table index cleanup...');
    
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
    
    // Remove unnecessary indexes (keep only essential ones)
    const indexesToRemove = [
      'idx_lab_tenant_id',
      'idx_lab_subscription_status',
      'idx_lab_created_at',
      'idx_lab_updated_at'
    ];
    
    for (const indexName of indexesToRemove) {
      try {
        console.log(`🗑️  Removing index: ${indexName}`);
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`lab\``);
        console.log(`✅ Removed index: ${indexName}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`ℹ️  Index ${indexName} doesn't exist, skipping...`);
        } else {
          console.log(`⚠️  Could not remove index ${indexName}: ${error.message}`);
        }
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
    
    console.log('✅ Lab table index cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
fixLabIndexes(); 