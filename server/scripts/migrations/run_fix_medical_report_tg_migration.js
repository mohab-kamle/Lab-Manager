const { sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('=== Running medical_report_has_tg Fix Migration ===');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/fix_medical_report_has_tg_unique_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL:');
    console.log(migrationSQL);
    console.log('\n=== Executing Migration ===');
    
    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 80)}...`);
          const [result] = await sequelize.query(statement);
          if (result && result.length > 0) {
            console.log('Result:', result);
          }
          console.log('✅ Success');
        } catch (error) {
          if (error.message.includes('check that column/key exists')) {
            console.log('ℹ️  Constraint already removed or doesn\'t exist');
          } else {
            console.error('❌ Error:', error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n=== Verifying Fix ===');
    
    // Verify the table structure after migration
    const [tableStructure] = await sequelize.query('SHOW CREATE TABLE medical_report_has_tg');
    console.log('Updated table structure:');
    console.log(tableStructure[0]['Create Table']);
    
    // Test if we can now create multiple test group associations
    console.log('\n=== Testing Multiple Test Group Associations ===');
    
    const transaction = await sequelize.transaction();
    
    try {
      // Test with medical report 14
      const medicalReportId = 14;
      const testGroupsToAdd = [2, 3];
      
      // Clear existing associations
      await sequelize.query(
        'DELETE FROM medical_report_has_tg WHERE medical_report_id = ?',
        { replacements: [medicalReportId], transaction }
      );
      
      // Try to create multiple associations
      for (const tgId of testGroupsToAdd) {
        await sequelize.query(
          'INSERT INTO medical_report_has_tg (medical_report_id, test_group_id, value) VALUES (?, ?, NULL)',
          { replacements: [medicalReportId, tgId], transaction }
        );
        console.log(`✅ Successfully added test group ${tgId} to medical report ${medicalReportId}`);
      }
      
      // Verify the associations were created
      const [associations] = await sequelize.query(
        'SELECT * FROM medical_report_has_tg WHERE medical_report_id = ?',
        { replacements: [medicalReportId], transaction }
      );
      
      console.log(`\nFinal verification: Medical report ${medicalReportId} now has ${associations.length} test group associations:`);
      associations.forEach(assoc => {
        console.log(`  - Test Group ID: ${assoc.test_group_id}`);
      });
      
      if (associations.length === testGroupsToAdd.length) {
        console.log('\n🎉 SUCCESS: Multiple test groups can now be associated with medical reports!');
      } else {
        console.log('\n❌ FAILURE: Still unable to create multiple associations');
      }
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    console.log('\n=== Migration Completed Successfully ===');
    process.exit(0);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();