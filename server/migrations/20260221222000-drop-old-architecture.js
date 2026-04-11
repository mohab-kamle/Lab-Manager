'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Remove the FK constraint group_id from the test table.
        try {
            // In MySQL, constraint names are often auto-generated unless specified.
            // Easiest robust workaround for this when exact name is unknown is just to drop the column directly, 
            // but standard requires removing constraint first. 
            await sequelize.query('ALTER TABLE `test` DROP FOREIGN KEY `test_ibfk_groupId`;');
        } catch (e) {
            console.log('Foreign key constraint might have different name or already removed.');
        }

        // 2. Drop the group_id column from the test table.
        try {
            await queryInterface.removeColumn('test', 'group_id');
        } catch (e) {
            console.log('Column group_id already removed.');
        }

        // 3. Remove the FK constraints from medical_report_results linking to test_components.
        try {
            await sequelize.query('ALTER TABLE `medical_report_results` DROP FOREIGN KEY `medical_report_test_component_result_ibfk_2`;');
        } catch (e) {
            console.log('FK constraint does not exist.');
        }

        // We should drop the now-orphaned test_component_id column from medical_report_results
        try {
            await queryInterface.removeColumn('medical_report_results', 'test_component_id');
        } catch (e) { }

        // 4. DROP TABLE test_components
        try { await queryInterface.dropTable('test_component'); } catch (e) { }
        try { await queryInterface.dropTable('test_components'); } catch (e) { }

        // 5. DROP TABLE test_group_test (if it exists)
        try { await queryInterface.dropTable('test_group_test'); } catch (e) { }

        // 6. DROP TABLE test_groups
        try { await queryInterface.dropTable('test_group'); } catch (e) { }
        try { await queryInterface.dropTable('test_groups'); } catch (e) { }
    },

    down: async (queryInterface, Sequelize) => {
        throw new Error("This destruction migration is irreversible.");
    }
};
