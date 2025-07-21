const { sequelize } = require('../models');

/**
 * Fix Bill Table Constraint Issues
 * 
 * This script specifically addresses the issue with the bill table
 * where Sequelize tries to remove a foreign key constraint that doesn't exist.
 */

async function fixBillConstraints() {
  try {
    console.log('🔧 Fixing bill table constraint issues...');
    
    // Check if bill table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bill'
    `);
    
    if (tables.length === 0) {
      console.log('✅ Bill table does not exist, will be created by sync');
      return;
    }
    
    console.log('✅ Bill table exists, checking constraints...');
    
    // Get existing constraints for bill table
    const [constraints] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bill'
      AND CONSTRAINT_NAME IS NOT NULL
    `);
    
    console.log(`📋 Found ${constraints.length} constraints on bill table`);
    
    // Check for the specific problematic constraint
    const problematicConstraint = constraints.find(c => 
      c.CONSTRAINT_NAME === 'bill_ibfk_834' || 
      c.CONSTRAINT_NAME.includes('bill_ibfk')
    );
    
    if (problematicConstraint) {
      console.log(`🔍 Found problematic constraint: ${problematicConstraint.CONSTRAINT_NAME}`);
      
      // Check if referenced table exists
      const [referencedTable] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
      `, {
        replacements: [problematicConstraint.REFERENCED_TABLE_NAME]
      });
      
      if (referencedTable[0].count === 0) {
        console.log(`⚠️  Referenced table ${problematicConstraint.REFERENCED_TABLE_NAME} does not exist`);
        console.log(`🗑️  Removing orphaned constraint: ${problematicConstraint.CONSTRAINT_NAME}`);
        
        try {
          await sequelize.query(`
            ALTER TABLE \`bill\` 
            DROP FOREIGN KEY \`${problematicConstraint.CONSTRAINT_NAME}\`
          `);
          console.log(`✅ Successfully removed orphaned constraint`);
        } catch (dropError) {
          console.log(`❌ Failed to remove constraint: ${dropError.message}`);
        }
      }
    } else {
      console.log('✅ No problematic constraints found');
    }
    
    // Add missing columns if they don't exist
    console.log('🔍 Checking for missing columns...');
    
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bill'
    `);
    
    const columnNames = columns.map(c => c.COLUMN_NAME);
    
    // Add lab_id if it doesn't exist
    if (!columnNames.includes('lab_id')) {
      console.log('➕ Adding lab_id column...');
      try {
        await sequelize.query(`
          ALTER TABLE \`bill\` 
          ADD COLUMN \`lab_id\` INT NULL
        `);
        console.log('✅ Added lab_id column');
      } catch (error) {
        console.log(`❌ Failed to add lab_id: ${error.message}`);
      }
    }
    
    // Add branch_id if it doesn't exist
    if (!columnNames.includes('branch_id')) {
      console.log('➕ Adding branch_id column...');
      try {
        await sequelize.query(`
          ALTER TABLE \`bill\` 
          ADD COLUMN \`branch_id\` INT NULL
        `);
        console.log('✅ Added branch_id column');
      } catch (error) {
        console.log(`❌ Failed to add branch_id: ${error.message}`);
      }
    }
    
    console.log('✅ Bill table constraint fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing bill constraints:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting bill table constraint fix...\n');
    
    await fixBillConstraints();
    
    console.log('\n🎉 Bill table constraint fix completed successfully!');
    console.log('💡 The database should now sync without constraint errors.');
    
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
  fixBillConstraints
}; 