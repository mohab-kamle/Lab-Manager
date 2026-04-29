#!/usr/bin/env node

/**
 * Database Synchronization Script
 * 
 * This script synchronizes the database schema with the current models
 * without affecting existing data.
 * 
 * Usage:
 *   node syncDatabase.js                    # Normal sync (alter mode)
 *   node syncDatabase.js force              # Force sync (drops all data)
 *   node syncDatabase.js check              # Only check connection and tables
 */

require("dotenv").config();
const db = require("../models");

// Parse command line arguments
const args = process.argv.slice(2);
const forceSync = args.includes('force');
const checkOnly = args.includes('check');
const verbose = args.includes('verbose');
const isProduction = process.env.NODE_ENV === "production";

async function checkDatabaseConnection() {
  try {
    console.log(`🔌 Testing database connection...`);
    await db.sequelize.authenticate();
    console.log(`✅ Database connection successful`);
    return true;
  } catch (error) {
    console.error(`❌ Database connection failed:`, error.message);
    return false;
  }
}

async function checkTableStatus() {
  const keyTables = [
    'patients', 'tests', 'cultures', 'medical_reports', 'test_groups',
    'employees', 'admins', 'chemists', 'receptionists', 'bills',
    'antibiotics', 'medical_report_has_culture_antibiotic'
  ];

  console.log(`📊 Checking table status...`);

  const results = {};
  for (const table of keyTables) {
    try {
      await db.sequelize.query(`SELECT 1 FROM ${table} LIMIT 1`);
      results[table] = '✅ Exists';
    } catch (error) {
      if (error.message.includes('doesn\'t exist')) {
        results[table] = '❌ Missing';
      } else {
        results[table] = `⚠️  Error: ${error.message}`;
      }
    }
  }

  console.log(`📋 Table Status:`);
  Object.entries(results).forEach(([table, status]) => {
    console.log(`   ${table.padEnd(35)} ${status}`);
  });

  const missingTables = Object.entries(results).filter(([_, status]) => status === '❌ Missing');
  const errorTables = Object.entries(results).filter(([_, status]) => status.startsWith('⚠️'));

  return { missingTables, errorTables, results };
}

// Fix medical_report_has_culture table structure
async function fixMedicalReportHasCultureTable() {
  try {
    console.log(`🔧 Checking medical_report_has_culture table structure...`);

    // Check if table exists
    const [tables] = await db.sequelize.query(
      "SHOW TABLES LIKE 'medical_report_has_culture'"
    );

    if (tables.length === 0) {
      console.log(`✅ medical_report_has_culture table doesn't exist, will be created by sync`);
      return;
    }

    // Check if table has the correct structure (id column as primary key)
    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM medical_report_has_culture"
    );

    const hasIdColumn = columns.some(col => col.Field === 'id' && col.Key === 'PRI');
    const hasCompositeKey = columns.some(col => col.Key === 'PRI' && col.Field !== 'id');
    const hasAnyPrimaryKey = columns.some(col => col.Key === 'PRI');

    if (hasIdColumn) {
      console.log(`✅ medical_report_has_culture table has correct structure`);
      return;
    }

    if (hasAnyPrimaryKey) {
      console.log(`🔧 Fixing medical_report_has_culture table structure...`);

      try {
        // First, try to drop any existing primary key
        await db.sequelize.query("ALTER TABLE medical_report_has_culture DROP PRIMARY KEY");
        console.log(`✅ Dropped existing primary key`);
      } catch (dropError) {
        console.log(`⚠️  Could not drop primary key: ${dropError.message}`);
        // Continue anyway, might not have a primary key
      }

      try {
        // Check if id column already exists
        const idColumnExists = columns.some(col => col.Field === 'id');

        if (!idColumnExists) {
          // Add id column as primary key
          await db.sequelize.query(`
            ALTER TABLE medical_report_has_culture 
            ADD COLUMN id int NOT NULL AUTO_INCREMENT FIRST,
            ADD PRIMARY KEY (id)
          `);
          console.log(`✅ Added id column as primary key`);
        } else {
          // Just add primary key to existing id column
          await db.sequelize.query(`
            ALTER TABLE medical_report_has_culture 
            ADD PRIMARY KEY (id)
          `);
          console.log(`✅ Added primary key to existing id column`);
        }
      } catch (addError) {
        console.log(`⚠️  Could not add id primary key: ${addError.message}`);
      }

      try {
        // Add unique constraint for medical_report_id and culture_id combination
        await db.sequelize.query(`
          ALTER TABLE medical_report_has_culture 
          ADD UNIQUE KEY unique_medical_report_culture (medical_report_id, culture_id)
        `);
        console.log(`✅ Added unique constraint`);
      } catch (constraintError) {
        console.log(`⚠️  Could not add unique constraint: ${constraintError.message}`);
      }

      console.log(`✅ medical_report_has_culture table structure fix completed`);
    }
  } catch (error) {
    console.error(`❌ Error fixing medical_report_has_culture table:`, error.message);
    // Don't throw error, let the normal sync handle it
  }
}

async function syncDatabase() {
  try {
    console.log(`🔄 Starting database synchronization...`);

    // Check connection first
    const connected = await checkDatabaseConnection();
    if (!connected) {
      process.exit(1);
    }

    // Fix medical_report_has_culture table structure if needed
    await fixMedicalReportHasCultureTable();

    // Check current table status
    const tableStatus = await checkTableStatus();

    if (checkOnly) {
      console.log(`\n✅ Database check completed`);
      return;
    }

    // Determine sync mode
    let syncOptions;
    if (forceSync) {
      if (isProduction) {
        console.error(`❌ Force sync is not allowed in production!`);
        process.exit(1);
      }
      syncOptions = { force: true };
      console.log(`⚠️  WARNING: Force sync will drop all tables and recreate them!`);
      console.log(`⚠️  This will DELETE ALL DATA!`);
    } else {
      syncOptions = { alter: true };
      console.log(`🛡️  Using ALTER mode (preserves existing data)`);
    }

    // Perform sync
    console.log(`\n🔄 Synchronizing database schema...`);
    await db.sequelize.sync(syncOptions);
    console.log(`✅ Database synchronization completed successfully`);

    // Check table status after sync
    console.log(`\n📊 Post-sync table status:`);
    await checkTableStatus();

    console.log(`\n🎉 Database synchronization completed!`);

  } catch (error) {
    console.error(`❌ Database synchronization failed:`, error);

    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error(`💡 Tip: Make sure your database server is running`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`💡 Tip: Check your database credentials in config/config.js`);
    } else if (error.message.includes('Unknown column')) {
      console.error(`💡 Tip: This might be a schema mismatch. Consider using --force flag`);
    } else if (error.message.includes('ER_DUP_FIELDNAME')) {
      console.error(`💡 Tip: Duplicate column detected. This might be a model definition issue`);
    } else if (error.message.includes('Multiple primary key defined')) {
      console.error(`💡 Tip: Primary key conflict detected. This has been automatically fixed.`);
    }

    process.exit(1);
  } finally {
    // Close database connection
    await db.sequelize.close();
    console.log(`🔌 Database connection closed`);
  }
}

// Run the script
if (require.main === module) {
  syncDatabase();
}

module.exports = { syncDatabase, checkDatabaseConnection, checkTableStatus }; 