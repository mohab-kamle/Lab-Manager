const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    // Read database config
    const configPath = path.join(__dirname, 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbConfig = config.development;
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    });
    
    console.log('Connected to database');
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, 'migrations', 'remove_tg_id_from_medical_report_has_tg.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await connection.execute(migrationSQL);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration(); 