const { sequelize } = require('../models');

async function runGenderMigration() {
  try {
    console.log('Running gender migration...');
    
    // First, update existing data
    console.log('Updating existing gender data...');
    
    // Update patient table
    await sequelize.query("UPDATE patient SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE patient SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated patient gender data');
    
    // Update doctor table
    await sequelize.query("UPDATE doctor SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE doctor SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated doctor gender data');
    
    // Update employee table
    await sequelize.query("UPDATE employee SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE employee SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated employee gender data');
    
    // Update test_component table
    await sequelize.query("UPDATE test_component SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE test_component SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated test_component gender data');
    
    // Now alter the columns
    console.log('Altering gender columns...');
    
    await sequelize.query("ALTER TABLE patient MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    console.log('✓ Updated patient gender column');
    
    await sequelize.query("ALTER TABLE doctor MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    console.log('✓ Updated doctor gender column');
    
    await sequelize.query("ALTER TABLE employee MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    console.log('✓ Updated employee gender column');
    
    await sequelize.query("ALTER TABLE test_component MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    console.log('✓ Updated test_component gender column');
    
    console.log('✅ Gender migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running gender migration:', error);
    throw error;
  }
}

// Run the migration
runGenderMigration()
  .then(() => {
    console.log('Migration completed. You can now start the server.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 