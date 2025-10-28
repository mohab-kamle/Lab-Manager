const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runReferralMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'labmanager',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, '../migrations/20250116_create_referral_table_and_add_to_patient.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: 20250116_create_referral_table_and_add_to_patient.sql');
    
    // Split the SQL file into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.trim().substring(0, 80)}...`);
          await connection.execute(statement);
          console.log('✅ Success');
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('Duplicate column')) {
            console.log('ℹ️  Skipped (already exists)');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Referral migration completed successfully');
    
    // Verify the changes
    console.log('\n📋 Verification:');
    
    try {
      const [referralRows] = await connection.execute('DESCRIBE referral');
      console.log('✓ Referral table structure:');
      referralRows.forEach(row => {
        console.log(`  - ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
    } catch (error) {
      console.log('✗ Referral table not found');
    }
    
    try {
      const [patientRows] = await connection.execute('SHOW COLUMNS FROM patient LIKE "referral_id"');
      if (patientRows.length > 0) {
        console.log('✓ referral_id column added to patient table');
      } else {
        console.log('✗ referral_id column not found in patient table');
      }
    } catch (error) {
      console.log('✗ Error checking patient table:', error.message);
    }
    
    try {
      const [referralCount] = await connection.execute('SELECT COUNT(*) as count FROM referral');
      console.log(`✓ Referral table has ${referralCount[0].count} records`);
    } catch (error) {
      console.log('✗ Error counting referral records:', error.message);
    }

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

// Run the migration
runReferralMigration();