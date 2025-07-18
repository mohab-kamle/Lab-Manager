const { sequelize } = require('./models');

async function safeGenderMigration() {
  try {
    console.log('Running safe gender migration...\n');
    
    // Step 1: Convert all gender columns to VARCHAR temporarily
    console.log('Step 1: Converting gender columns to VARCHAR...');
    
    await sequelize.query("ALTER TABLE patient MODIFY COLUMN gender VARCHAR(10) NULL");
    await sequelize.query("ALTER TABLE doctor MODIFY COLUMN gender VARCHAR(10) NULL");
    await sequelize.query("ALTER TABLE employee MODIFY COLUMN gender VARCHAR(10) NULL");
    await sequelize.query("ALTER TABLE test_component MODIFY COLUMN gender VARCHAR(10) NULL");
    
    console.log('✓ All gender columns converted to VARCHAR\n');
    
    // Step 2: Update the data
    console.log('Step 2: Updating gender data...');
    
    await sequelize.query("UPDATE patient SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE patient SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated patient gender data');
    
    await sequelize.query("UPDATE doctor SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE doctor SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated doctor gender data');
    
    await sequelize.query("UPDATE employee SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE employee SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated employee gender data');
    
    await sequelize.query("UPDATE test_component SET gender = 'Male' WHERE gender = 'm'");
    await sequelize.query("UPDATE test_component SET gender = 'Female' WHERE gender = 'f'");
    console.log('✓ Updated test_component gender data\n');
    
    // Step 3: Convert back to ENUM
    console.log('Step 3: Converting gender columns to ENUM...');
    
    await sequelize.query("ALTER TABLE patient MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    await sequelize.query("ALTER TABLE doctor MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    await sequelize.query("ALTER TABLE employee MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    await sequelize.query("ALTER TABLE test_component MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    
    console.log('✓ All gender columns converted to ENUM\n');
    
    // Step 4: Verify the changes
    console.log('Step 4: Verifying changes...');
    
    const tables = ['patient', 'doctor', 'employee', 'test_component'];
    for (const table of tables) {
      const result = await sequelize.query(`SELECT DISTINCT gender, COUNT(*) as count FROM ${table} GROUP BY gender`);
      console.log(`${table} table:`, result[0]);
    }
    
    console.log('\n✅ Safe gender migration completed successfully!');
    console.log('You can now start the server with the updated models.');
    
  } catch (error) {
    console.error('❌ Error in safe gender migration:', error);
    throw error;
  }
}

// Run the migration
safeGenderMigration()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 