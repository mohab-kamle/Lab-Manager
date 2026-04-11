const { sequelize } = require('./models');

async function run() {
    try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
        console.log('Foreign key checks disabled.');

        const tables = [
            'medical_report_has_culture_antibiotic',
            'medical_report_culture_result',
            'medical_report_has_culture',
            'bill_has_culture',
            'contract_has_culture',
            'pao_has_culture',
            'culture_antibiotics',
            'culture_results',
            'culture_sub_options',
            'culture_options',
            'cultures'
        ];

        for (const table of tables) {
            try {
                await sequelize.query(`DROP TABLE IF EXISTS ${table};`);
                console.log(`✅ Dropped ${table}`);
            } catch (err) {
                console.warn(`⚠️ Failed to drop ${table}: ${err.message}`);
            }
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('Foreign key checks re-enabled.');
        console.log('Done.');
    } catch (e) {
        console.error('Error during execution:', e);
    } finally {
        await sequelize.close();
    }
}

run();
