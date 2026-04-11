'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Make test_component_id nullable with a default value so that  
        // INSERTs that don't include it stop throwing "doesn't have a default value".
        // This is safer than trying to DROP the column (which has an unknown FK constraint name).
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE `medical_report_results` MODIFY COLUMN `test_component_id` INT NULL DEFAULT NULL'
            );
            console.log('Made test_component_id nullable with default NULL');
        } catch (e) {
            console.log('Could not modify test_component_id (may not exist, which is fine):', e.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Reversing this would be dangerous - leave as-is
    }
};
