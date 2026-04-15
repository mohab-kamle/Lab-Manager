'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Helper to safely execute queryInterface methods
        const safeExecute = async (operation, description) => {
            try {
                await operation();
                console.log(`✅ Success: ${description}`);
            } catch (error) {
                console.warn(`⚠️ Warning: Failed to ${description}. Reason: ${error.message}`);
            }
        };

        // 1. Drop obsolete columns from medical_report_results
        await safeExecute(async () => {
            const constraints = await queryInterface.showConstraint('medical_report_results');

            // Look for foreign key constraint on test_component_id
            const fkConstraint = constraints.find(c =>
                c.columnNames &&
                c.columnNames.includes('test_component_id') &&
                c.constraintType === 'FOREIGN KEY'
            );

            if (fkConstraint && fkConstraint.constraintName) {
                await queryInterface.removeConstraint('medical_report_results', fkConstraint.constraintName);
            }
        }, 'Remove FK constraint for test_component_id on medical_report_results');

        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'test_component_id'), 'Drop test_component_id column');
        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'result'), 'Drop result column');
        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'status'), 'Drop status column');

        // 2. Drop obsolete test tables
        // FK hierarchy: test_components belongs to test, test_group_test belongs to test_groups and test.
        // They don't block each other, but let's drop in order to be safe.
        await safeExecute(() => queryInterface.dropTable('test_components'), 'Drop test_components table');
        await safeExecute(() => queryInterface.dropTable('test_group_test'), 'Drop test_group_test table');
        await safeExecute(() => queryInterface.dropTable('test_groups'), 'Drop test_groups table');

        // 3. Drop obsolete culture tables (in STRICT order to avoid FK errors)
        // Add medical_report_has_culture_antibiotic and medical_report_culture_result before medical_report_has_culture
        await safeExecute(() => queryInterface.dropTable('medical_report_has_culture_antibiotic'), 'Drop medical_report_has_culture_antibiotic table');
        await safeExecute(() => queryInterface.dropTable('medical_report_culture_result'), 'Drop medical_report_culture_result table');

        // contract_has_culture and pao_has_culture might also exist, let's drop them to be safe if they reference cultures
        await safeExecute(() => queryInterface.dropTable('contract_has_culture'), 'Drop contract_has_culture table');
        await safeExecute(() => queryInterface.dropTable('pao_has_culture'), 'Drop pao_has_culture table');

        await safeExecute(() => queryInterface.dropTable('bill_has_culture'), 'Drop bill_has_culture table');
        await safeExecute(() => queryInterface.dropTable('medical_report_has_culture'), 'Drop medical_report_has_culture table');
        await safeExecute(() => queryInterface.dropTable('culture_results'), 'Drop culture_results table');
        await safeExecute(() => queryInterface.dropTable('culture_antibiotics'), 'Drop culture_antibiotics table');

        // Let's drop cultures table now.
        await safeExecute(() => queryInterface.dropTable('cultures'), 'Drop cultures table');
    },

    down: async (queryInterface, Sequelize) => {
        console.warn('⚠️ WARNING: The down migration for dropping the old architecture cannot be automatically completely restored.');
        console.warn('Data lost during the DROP operations must be recovered from a database backup.');

        // We cannot easily recreate all these tables with their precise original schema here.
        // Down migration might just recreate the tables empty, but that is rarely useful.
        // Alternatively, log warning.
    }
};
