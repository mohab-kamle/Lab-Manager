#!/usr/bin/env node

// Standalone script to fix primary key conflict
// Run with: node run_fix.js

require("dotenv").config();
const { Sequelize } = require("sequelize");
const config = require("../config/config.json");

async function runFix() {
  let sequelize;
  
  try {
    console.log("🔧 Starting primary key conflict fix...");
    
    // Connect to database
    const env = process.env.NODE_ENV || "development";
    const dbConfig = config[env];
    
    sequelize = new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: console.log,
        dialectOptions: {
          // Handle sql_require_primary_key constraint
          supportBigNumbers: true,
          bigNumberStrings: true
        }
      }
    );
    
    await sequelize.authenticate();
    console.log("✅ Database connection established");
    
    // Run the fix SQL
    console.log("🔄 Running primary key fix...");
    
    // Check if table exists
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'medical_report_has_culture'");
    if (tables.length === 0) {
      console.log("✅ Table doesn't exist, no fix needed");
      return;
    }
    
    // Create backup
    await sequelize.query("CREATE TABLE medical_report_has_culture_backup AS SELECT * FROM medical_report_has_culture");
    console.log("✅ Created backup table");
    
    // Drop original table
    await sequelize.query("DROP TABLE medical_report_has_culture");
    console.log("✅ Dropped original table");
    
    // Recreate with correct structure
    await sequelize.query(`
      CREATE TABLE medical_report_has_culture (
        id int NOT NULL AUTO_INCREMENT,
        medical_report_id int NOT NULL,
        culture_id int NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_medical_report_culture (medical_report_id, culture_id),
        KEY idx_medical_report_id (medical_report_id),
        KEY idx_culture_id (culture_id)
      )
    `);
    console.log("✅ Recreated table with correct structure");
    
    // Copy data back
    await sequelize.query(`
      INSERT INTO medical_report_has_culture (medical_report_id, culture_id, created_at, updated_at)
      SELECT medical_report_id, culture_id, created_at, updated_at 
      FROM medical_report_has_culture_backup
    `);
    console.log("✅ Copied data back from backup");
    
    // Drop backup table
    await sequelize.query("DROP TABLE medical_report_has_culture_backup");
    console.log("✅ Dropped backup table");
    
    // Verify the fix
    const [columns] = await sequelize.query("SHOW COLUMNS FROM medical_report_has_culture");
    console.log("📊 Final table structure:");
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Key === 'PRI' ? '(PRIMARY)' : ''} ${col.Key === 'UNI' ? '(UNIQUE)' : ''}`);
    });
    
    console.log("✅ Primary key conflict fix completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during fix:", error.message);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the fix
runFix(); 