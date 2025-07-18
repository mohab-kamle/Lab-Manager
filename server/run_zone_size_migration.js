const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.json');

async function runZoneSizeMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: config.development.host,
      user: config.development.username,
      password: config.development.password,
      database: config.development.database,
      multipleStatements: true
    });

    console.log('✓ Database connected');

    // Read and execute the migration
    const migrationPath = path.join(__dirname, 'migrations/add_zone_size_to_culture_antibiotic.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Adding zone_size field to medical_report_has_culture_antibiotic table...');
    await connection.execute(migrationSQL);
    console.log('✓ zone_size field added successfully');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runZoneSizeMigration(); 