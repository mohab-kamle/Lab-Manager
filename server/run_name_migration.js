const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, 'migrations', 'add_name_to_contract.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: add_name_to_contract.sql');
    
    // Split the SQL file into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim()}`);
        await connection.execute(statement);
      }
    }

    console.log('✅ Migration completed successfully');
    
    // Verify the changes
    const [rows] = await connection.execute('DESCRIBE contract');
    console.log('📋 Contract table structure:');
    rows.forEach(row => {
      console.log(`  - ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration(); 