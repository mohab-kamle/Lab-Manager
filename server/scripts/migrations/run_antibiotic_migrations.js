const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Add your password here
    database: 'labmanager'
  });

  try {
    console.log('Starting antibiotic migrations...');

    // Read and execute the medical_report_has_culture structure update
    const structureUpdateSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/update_medical_report_has_culture_structure.sql'), 
      'utf8'
    );
    console.log('Updating medical_report_has_culture table structure...');
    await connection.execute(structureUpdateSQL);
    console.log('✓ medical_report_has_culture table structure updated');

    // Read and execute the junction table creation
    const junctionTableSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/create_medical_report_has_culture_antibiotic.sql'), 
      'utf8'
    );
    console.log('Creating medical_report_has_culture_antibiotic table...');
    await connection.execute(junctionTableSQL);
    console.log('✓ medical_report_has_culture_antibiotic table created');

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigrations(); 