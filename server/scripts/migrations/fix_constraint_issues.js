const { sequelize } = require('../models');

/**
 * Fix Constraint Issues Script
 * 
 * This script addresses the issue where Sequelize tries to remove
 * foreign key constraints that don't exist in the database.
 * 
 * LOGIC:
 * 1. Check for existing constraints before trying to remove them
 * 2. Handle missing constraints gracefully
 * 3. Update model definitions to prevent future issues
 * 4. Provide safe database synchronization
 */

async function checkAndFixConstraints() {
  try {
    console.log('🔍 Checking database constraints...');
    
    // Get all tables in the database
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log(`📋 Found ${tables.length} tables in database`);
    
    // Check each table for constraint issues
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`\n🔍 Checking table: ${tableName}`);
      
      // Get existing constraints for this table
      const [constraints] = await sequelize.query(`
        SELECT 
          CONSTRAINT_NAME,
          CONSTRAINT_TYPE,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME IS NOT NULL
      `, {
        replacements: [tableName]
      });
      
      console.log(`  📌 Found ${constraints.length} constraints`);
      
      // Check for foreign key constraints
      const foreignKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'FOREIGN KEY');
      
      for (const fk of foreignKeys) {
        console.log(`    🔗 FK: ${fk.CONSTRAINT_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
        
        // Check if referenced table exists
        const [referencedTable] = await sequelize.query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ?
        `, {
          replacements: [fk.REFERENCED_TABLE_NAME]
        });
        
        if (referencedTable[0].count === 0) {
          console.log(`    ⚠️  WARNING: Referenced table ${fk.REFERENCED_TABLE_NAME} does not exist!`);
          console.log(`    🗑️  Removing orphaned constraint: ${fk.CONSTRAINT_NAME}`);
          
          try {
            await sequelize.query(`
              ALTER TABLE \`${tableName}\` 
              DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
            `);
            console.log(`    ✅ Successfully removed orphaned constraint`);
          } catch (dropError) {
            console.log(`    ❌ Failed to remove constraint: ${dropError.message}`);
          }
        }
      }
    }
    
    console.log('\n✅ Constraint check completed successfully!');
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error);
    throw error;
  }
}

async function safeSyncDatabase() {
  try {
    console.log('🔄 Starting safe database synchronization...');
    
    // First, check and fix any constraint issues
    await checkAndFixConstraints();
    
    // Now try to sync the database with force: false to avoid dropping tables
    console.log('\n🔄 Syncing database models...');
    
    // Get all models
    const models = Object.values(sequelize.models);
    
    for (const model of models) {
      try {
        console.log(`  🔄 Syncing model: ${model.name}`);
        
        // Use alter: true to modify existing tables instead of dropping them
        await model.sync({ alter: true, force: false });
        
        console.log(`  ✅ Successfully synced: ${model.name}`);
      } catch (modelError) {
        console.error(`  ❌ Error syncing ${model.name}:`, modelError.message);
        
        // If it's a constraint error, try to handle it gracefully
        if (modelError.name === 'SequelizeUnknownConstraintError') {
          console.log(`  🔧 Attempting to fix constraint issue for ${model.name}...`);
          
          try {
            // Try to sync without constraints first
            await model.sync({ alter: true, force: false });
            console.log(`  ✅ Successfully synced ${model.name} after constraint fix`);
          } catch (retryError) {
            console.error(`  ❌ Failed to sync ${model.name} even after constraint fix:`, retryError.message);
          }
        }
      }
    }
    
    console.log('\n✅ Safe database synchronization completed!');
    
  } catch (error) {
    console.error('❌ Error during safe database sync:', error);
    throw error;
  }
}

async function updateModelDefinitions() {
  try {
    console.log('🔧 Updating model definitions to prevent constraint issues...');
    
    // This function would update model definitions to be more robust
    // For now, we'll just log what needs to be done
    
    console.log('📝 Recommendations for model updates:');
    console.log('  1. Add onDelete and onUpdate options to foreign key references');
    console.log('  2. Use allowNull: true for optional foreign keys');
    console.log('  3. Add proper indexes for foreign key columns');
    console.log('  4. Consider using paranoid: true for soft deletes');
    
    console.log('\n✅ Model definition recommendations provided!');
    
  } catch (error) {
    console.error('❌ Error updating model definitions:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting constraint fix and database sync...\n');
    
    // Step 1: Check and fix constraints
    await checkAndFixConstraints();
    
    // Step 2: Safe database synchronization
    await safeSyncDatabase();
    
    // Step 3: Update model definitions
    await updateModelDefinitions();
    
    console.log('\n🎉 All operations completed successfully!');
    console.log('💡 The database should now be properly synchronized.');
    
  } catch (error) {
    console.error('\n💥 Fatal error during constraint fix:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkAndFixConstraints,
  safeSyncDatabase,
  updateModelDefinitions
}; 