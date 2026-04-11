'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Find and drop any FK constraints on test_component_id, then drop the column via raw SQL.
        // This bypasses Sequelize model validation issues that prevented previous migrations from working.

        // 1. Look up actual FK constraint names on medical_report_results
        try {
            const [constraints] = await queryInterface.sequelize.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'medical_report_results' 
                AND COLUMN_NAME = 'test_component_id'
                AND TABLE_SCHEMA = DATABASE()
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `);

            for (const row of constraints) {
                try {
                    await queryInterface.sequelize.query(
                        `ALTER TABLE medical_report_results DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
                    );
                    console.log(`Dropped FK: ${row.CONSTRAINT_NAME}`);
                } catch (e) {
                    console.log(`Could not drop FK ${row.CONSTRAINT_NAME}:`, e.message);
                }
            }
        } catch (e) {
            console.log('Could not query FK constraints:', e.message);
        }

        // 2. Drop test_component_id via raw SQL
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE `medical_report_results` DROP COLUMN `test_component_id`'
            );
            console.log('Dropped column: test_component_id');
        } catch (e) {
            console.log('Could not drop test_component_id (may not exist):', e.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.addColumn('medical_report_results', 'test_component_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        } catch (e) { }
    }
};
