const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lab_manager',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '20250115_add_new_fields_to_models.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration...');
    
    // Execute the migration
    await connection.execute(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('• Added cost, lab_to_lab_status, lab_name, timestamps to test table');
    console.log('• Added c_low, c_high to test_component table');
    console.log('• Added total, paid, due, contract_id to patient table');
    console.log('• Added registered_at, collected_at, received_at, reported_at to medical_report table');
    console.log('• Created question table');
    console.log('• Created test_has_question junction table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL Error:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runMigration(); 