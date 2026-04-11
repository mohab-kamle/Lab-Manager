'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Helper function to safely execute table drops (ignoring errors if tables don't exist)
        const safeDropTable = async (tableName) => {
            try {
                await queryInterface.dropTable(tableName);
                console.log(`✅ Successfully dropped table: ${tableName}`);
            } catch (error) {
                console.warn(`⚠️ Warning: Failed to drop table ${tableName}. It might not exist or there is a foreign key constraint. Reason: ${error.message}`);
            }
        };

        // First, drop tables that might have foreign keys pointing to cultures or culture_options
        await safeDropTable('medical_report_has_culture_antibiotic');
        await safeDropTable('medical_report_culture_result');
        await safeDropTable('medical_report_has_culture');
        await safeDropTable('bill_has_culture');
        await safeDropTable('contract_has_culture');
        await safeDropTable('pao_has_culture');
        await safeDropTable('culture_antibiotics');
        await safeDropTable('culture_results');
        await safeDropTable('culture_sub_options');
        await safeDropTable('culture_options');
        await safeDropTable('cultures');
    },

    down: async (queryInterface, Sequelize) => {
        console.warn('⚠️ WARNING: Down migration for dropping legacy culture tables is not implemented as data cannot be restored automatically.');
    }
};
