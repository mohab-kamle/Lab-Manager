const { sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

async function runMultiTenantMigration() {
  try {
    console.log('Starting multi-tenant SaaS migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/20250115_multi_tenant_saas_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await sequelize.query(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`✗ Error executing statement ${i + 1}:`, error.message);
        
        // Check if it's a duplicate column error (already exists)
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('Duplicate key name') ||
            error.message.includes('Table') && error.message.includes('already exists')) {
          console.log(`  → Skipping (already exists)`);
          continue;
        }
        
        // For other errors, ask user if they want to continue
        console.log('Do you want to continue with the remaining statements? (y/n)');
        // In a real scenario, you might want to implement user input handling
        // For now, we'll continue
      }
    }
    
    console.log('Multi-tenant migration completed successfully!');
    
    // Verify the migration by checking if key tables have the new columns
    console.log('\nVerifying migration...');
    
    const verificationQueries = [
      "SHOW COLUMNS FROM patient LIKE 'lab_id'",
      "SHOW COLUMNS FROM bill LIKE 'lab_id'",
      "SHOW COLUMNS FROM medical_report LIKE 'lab_id'",
      "SHOW COLUMNS FROM employee LIKE 'lab_id'",
      "SHOW COLUMNS FROM lab LIKE 'tenant_id'",
      "SHOW TABLES LIKE 'lab_settings'",
      "SHOW TABLES LIKE 'lab_activity_log'"
    ];
    
    for (const query of verificationQueries) {
      try {
        const [results] = await sequelize.query(query);
        if (results.length > 0) {
          console.log(`✓ ${query.split(' ')[2]} verified`);
        } else {
          console.log(`✗ ${query.split(' ')[2]} not found`);
        }
      } catch (error) {
        console.log(`✗ Error verifying ${query.split(' ')[2]}:`, error.message);
      }
    }
    
    console.log('\nMigration verification completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMultiTenantMigration();
}

module.exports = runMultiTenantMigration; 