const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');
        
        // Read and execute migrations in order
        const migrations = [
            'add_bill_id_to_medical_report.sql',
            'create_medical_report_has_culture.sql',
            'update_medical_report_has_test_status.sql'
        ];

        for (const migration of migrations) {
            const migrationPath = path.join(__dirname, '..', 'migrations', migration);
            
            if (fs.existsSync(migrationPath)) {
                console.log(`📄 Executing migration: ${migration}`);
                const sql = fs.readFileSync(migrationPath, 'utf8');
                
                // Split SQL by semicolon and execute each statement
                const statements = sql.split(';').filter(stmt => stmt.trim());
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await sequelize.query(statement);
                    }
                }
                
                console.log(`✅ Migration completed: ${migration}`);
            } else {
                console.log(`⚠️  Migration file not found: ${migration}`);
            }
        }
        
        console.log('🎉 All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations(); 