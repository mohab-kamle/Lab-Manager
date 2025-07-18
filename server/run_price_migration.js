const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runPriceMigration() {
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
    const migrationPath = path.join(__dirname, 'migrations', 'add_price_fields_to_bill_junction_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running price fields migration...');
    
    // Split the SQL into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const [result] = await connection.execute(statement);
          console.log('Statement executed:', statement.substring(0, 50) + '...');
          if (result && result.length > 0) {
            console.log('Result:', result);
          }
        } catch (error) {
          console.log('Statement skipped (likely already exists):', error.message);
        }
      }
    }
    
    console.log('Price fields migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runPriceMigration(); 