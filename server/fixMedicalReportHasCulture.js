#!/usr/bin/env node

/**
 * Fix medical_report_has_culture table structure
 * 
 * This script specifically fixes the primary key conflict in the medical_report_has_culture table
 * by converting from composite primary key to separate id primary key.
 */

require("dotenv").config();
const db = require("./models");

async function fixMedicalReportHasCultureTable() {
  try {
    console.log(`🔧 Starting medical_report_has_culture table structure fix...`);
    
    // Check if table exists
    const [tables] = await db.sequelize.query(
      "SHOW TABLES LIKE 'medical_report_has_culture'"
    );
    
    if (tables.length === 0) {
      console.log(`✅ medical_report_has_culture table doesn't exist`);
      return;
    }
    
    console.log(`✅ medical_report_has_culture table exists`);
    
    // Check current table structure
    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM medical_report_has_culture"
    );
    
    console.log(`📊 Current columns:`, columns.map(col => `${col.Field} (${col.Type}, Key: ${col.Key})`));
    
    const hasIdColumn = columns.some(col => col.Field === 'id');
    const hasIdPrimaryKey = columns.some(col => col.Field === 'id' && col.Key === 'PRI');
    const hasAnyPrimaryKey = columns.some(col => col.Key === 'PRI');
    
    console.log(`🔍 Analysis:`);
    console.log(`  - Has id column: ${hasIdColumn}`);
    console.log(`  - Has id as primary key: ${hasIdPrimaryKey}`);
    console.log(`  - Has any primary key: ${hasAnyPrimaryKey}`);
    
    if (hasIdPrimaryKey) {
      console.log(`✅ Table already has correct structure (id as primary key)`);
      return;
    }
    
    // Step 1: Drop existing primary key if it exists
    if (hasAnyPrimaryKey) {
      try {
        console.log(`🔧 Step 1: Dropping existing primary key...`);
        await db.sequelize.query("ALTER TABLE medical_report_has_culture DROP PRIMARY KEY");
        console.log(`✅ Successfully dropped existing primary key`);
      } catch (error) {
        console.log(`⚠️  Warning: Could not drop primary key: ${error.message}`);
        console.log(`   This might be okay if there was no primary key`);
      }
    }
    
    // Step 2: Add id column if it doesn't exist
    if (!hasIdColumn) {
      try {
        console.log(`🔧 Step 2: Adding id column...`);
        await db.sequelize.query(`
          ALTER TABLE medical_report_has_culture 
          ADD COLUMN id int NOT NULL AUTO_INCREMENT FIRST
        `);
        console.log(`✅ Successfully added id column`);
      } catch (error) {
        console.log(`❌ Error adding id column: ${error.message}`);
        throw error;
      }
    } else {
      console.log(`✅ id column already exists`);
    }
    
    // Step 3: Add primary key to id column
    try {
      console.log(`🔧 Step 3: Adding primary key to id column...`);
      await db.sequelize.query(`
        ALTER TABLE medical_report_has_culture 
        ADD PRIMARY KEY (id)
      `);
      console.log(`✅ Successfully added primary key to id column`);
    } catch (error) {
      console.log(`❌ Error adding primary key: ${error.message}`);
      throw error;
    }
    
    // Step 4: Add unique constraint for medical_report_id and culture_id
    try {
      console.log(`🔧 Step 4: Adding unique constraint...`);
      await db.sequelize.query(`
        ALTER TABLE medical_report_has_culture 
        ADD UNIQUE KEY unique_medical_report_culture (medical_report_id, culture_id)
      `);
      console.log(`✅ Successfully added unique constraint`);
    } catch (error) {
      console.log(`⚠️  Warning: Could not add unique constraint: ${error.message}`);
      console.log(`   This might already exist`);
    }
    
    // Step 5: Verify the fix
    console.log(`🔧 Step 5: Verifying the fix...`);
    const [newColumns] = await db.sequelize.query(
      "SHOW COLUMNS FROM medical_report_has_culture"
    );
    
    const newHasIdPrimaryKey = newColumns.some(col => col.Field === 'id' && col.Key === 'PRI');
    const hasUniqueConstraint = newColumns.some(col => col.Field === 'medical_report_id' && col.Key === 'UNI');
    
    console.log(`📊 Verification:`);
    console.log(`  - Has id as primary key: ${newHasIdPrimaryKey}`);
    console.log(`  - Has unique constraint: ${hasUniqueConstraint}`);
    
    if (newHasIdPrimaryKey) {
      console.log(`🎉 SUCCESS: medical_report_has_culture table structure fixed successfully!`);
    } else {
      console.log(`❌ FAILED: Table structure fix was not successful`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing medical_report_has_culture table:`, error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixMedicalReportHasCultureTable()
    .then(() => {
      console.log(`✅ Fix completed successfully`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`❌ Fix failed:`, error);
      process.exit(1);
    })
    .finally(async () => {
      await db.sequelize.close();
      console.log(`🔌 Database connection closed`);
    });
}

module.exports = { fixMedicalReportHasCultureTable }; 