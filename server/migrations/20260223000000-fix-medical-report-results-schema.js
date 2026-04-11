'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Drop FK constraint on test_component_id if it still exists, then drop the column.
        // This fixes the "Field 'test_component_id' doesn't have a default value" error.

        // 1. Drop any FK constraint referencing test_component_id
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE `medical_report_results` DROP FOREIGN KEY `medical_report_test_component_result_ibfk_2`;'
            );
            console.log('Dropped FK constraint: medical_report_test_component_result_ibfk_2');
        } catch (e) {
            console.log('FK constraint does not exist or already removed:', e.message);
        }

        // Try alternate FK name patterns
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE `medical_report_results` DROP FOREIGN KEY `medical_report_results_ibfk_2`;'
            );
            console.log('Dropped FK constraint: medical_report_results_ibfk_2');
        } catch (e) {
            console.log('Alternate FK constraint does not exist:', e.message);
        }

        // 2. Drop the test_component_id column if it still exists
        try {
            await queryInterface.removeColumn('medical_report_results', 'test_component_id');
            console.log('Dropped column: test_component_id from medical_report_results');
        } catch (e) {
            console.log('Column test_component_id already removed or does not exist:', e.message);
        }

        // 3. Ensure clinical_flag allows the values we send (e.g. 'critical low', 'critical high', 'pending', 'done')
        // by switching to VARCHAR if ENUM is too restrictive
        try {
            await queryInterface.changeColumn('medical_report_results', 'clinical_flag', {
                type: Sequelize.STRING(50),
                allowNull: true,
                defaultValue: null,
            });
            console.log('Changed clinical_flag to VARCHAR(50)');
        } catch (e) {
            console.log('Could not change clinical_flag column:', e.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Restore the test_component_id column (as nullable to avoid breaking anything)
        try {
            await queryInterface.addColumn('medical_report_results', 'test_component_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        } catch (e) { }
    }
};
