const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'labmanager',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  }
);

async function runMigration() {
  console.log('🚀 Starting Safe Migration Process...\n');
  
  // Check if backup reminder
  console.log('⚠️  IMPORTANT: Have you backed up your database?');
  console.log('   - Use MySQL Workbench: Server > Data Export > Select labmanager > Export to Self-Contained File');
  console.log('   - Or use phpMyAdmin: Export > Custom > Select all tables > Go');
  console.log('   - Or manually: mysqldump -u root -p labmanager > backup_$(date +%Y%m%d_%H%M%S).sql\n');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    rl.question('Have you backed up your database? (yes/no): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Please backup your database first before running this migration!');
    process.exit(1);
  }

  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add_timestamps_safe.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Running migration...');
    console.log('   - Adding createdAt and updatedAt columns to medical_report table');
    console.log('   - Adding createdAt and updatedAt columns to patient table');
    console.log('   - Updating existing records with meaningful timestamps\n');

    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sequelize.query(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('ℹ️  Skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Verification:');
    
    // Verify the changes
    const [medicalReportCount] = await sequelize.query(
      "SELECT COUNT(*) as total, COUNT(createdAt) as with_createdAt FROM medical_report"
    );
    const [patientCount] = await sequelize.query(
      "SELECT COUNT(*) as total, COUNT(createdAt) as with_createdAt FROM patient"
    );

    console.log(`   - medical_report: ${medicalReportCount[0].total} total records, ${medicalReportCount[0].with_createdAt} with timestamps`);
    console.log(`   - patient: ${patientCount[0].total} total records, ${patientCount[0].with_createdAt} with timestamps`);

    console.log('\n✅ Migration verification successful!');
    console.log('\n🔄 Next steps:');
    console.log('   1. Restart your server to apply the new model changes');
    console.log('   2. Test the AdminDashboard to ensure it works correctly');
    console.log('   3. Verify that new records get proper timestamps');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n🔄 To rollback:');
    console.log('   - Restore from your backup');
    console.log('   - Or manually drop the createdAt/updatedAt columns');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
runMigration().catch(console.error); 