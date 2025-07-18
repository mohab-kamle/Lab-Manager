const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.json');

async function runCompleteAntibioticMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting Complete Antibiotic Sensitivity Migration...\n');
    
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection({
      host: config.development.host,
      user: config.development.username,
      password: config.development.password,
      database: config.development.database,
      multipleStatements: true
    });

    console.log('✅ Database connected successfully\n');

    // Read the comprehensive migration file
    const migrationPath = path.join(__dirname, 'migrations/complete_antibiotic_sensitivity_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Executing comprehensive migration...');
    console.log('This will:');
    console.log('  • Create/update medical_report_has_culture_antibiotic table');
    console.log('  • Add zone_size field for zone of inhibition measurements');
    console.log('  • Ensure antibiotic table has all required fields');
    console.log('  • Add common antibiotics to the database');
    console.log('  • Create helpful database views');
    console.log('  • Add proper indexes and constraints\n');

    // Execute the migration
    const [results] = await connection.execute(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');

    // Get verification results
    const [verificationResults] = await connection.execute(`
      SELECT 
        'Migration completed successfully!' as status,
        (SELECT COUNT(*) FROM antibiotic) as total_antibiotics,
        (SELECT COUNT(*) FROM medical_report_has_culture_antibiotic) as total_culture_antibiotics
    `);

    if (verificationResults.length > 0) {
      const result = verificationResults[0];
      console.log('📊 Migration Summary:');
      console.log(`  • Status: ${result.status}`);
      console.log(`  • Total antibiotics in database: ${result.total_antibiotics}`);
      console.log(`  • Total culture-antibiotic relationships: ${result.total_culture_antibiotics}`);
    }

    // Show some sample antibiotics
    const [antibiotics] = await connection.execute(`
      SELECT name, shortcut, commercial_name 
      FROM antibiotic 
      ORDER BY name 
      LIMIT 10
    `);

    console.log('\n📋 Sample antibiotics available:');
    antibiotics.forEach(ab => {
      console.log(`  • ${ab.name} (${ab.shortcut}) - ${ab.commercial_name || 'No commercial name'}`);
    });

    console.log('\n🎉 Complete Antibiotic Sensitivity Migration finished successfully!');
    console.log('\n✨ Features now available:');
    console.log('  • Expandable antibiotic sensitivity sections');
    console.log('  • Search and filter antibiotics');
    console.log('  • Add antibiotics on the fly');
    console.log('  • Zone of inhibition measurements');
    console.log('  • Standard medical abbreviations (S/I/R)');
    console.log('  • Color-coded sensitivity indicators');
    console.log('  • Professional PDF reports');
    console.log('  • Comprehensive validation and error handling');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('  • Check database connection settings');
    console.error('  • Ensure database user has ALTER, CREATE, INSERT permissions');
    console.error('  • Verify that required tables (antibiotic, medical_report_has_culture) exist');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
runCompleteAntibioticMigration(); 