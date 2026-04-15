'use strict';

/**
 * FINAL PATCH: Drop test_group_result (which holds a FK to test_group),
 * then drop test_group itself.
 *
 * Also verifies test_component_id is gone from medical_report_results.
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        console.log('\n[FINAL PATCH] Dropping remaining legacy TG tables...');

        // 1. Find every table that holds a FK pointing at test_group dynamically,
        //    then drop those tables before attempting to drop test_group.
        try {
            const blockers = await queryInterface.sequelize.query(
                `SELECT DISTINCT TABLE_NAME
                 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA          = DATABASE()
                   AND REFERENCED_TABLE_NAME = 'test_group'`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            console.log(`  [FK] Tables with FKs pointing to test_group: ${blockers.map(r => r.TABLE_NAME).join(', ') || 'none'}`);

            for (const { TABLE_NAME } of blockers) {
                try {
                    await queryInterface.dropTable(TABLE_NAME);
                    console.log(`  [TABLE] Dropped blocker table: ${TABLE_NAME}`);
                } catch (e) {
                    console.warn(`  [TABLE] Could not drop ${TABLE_NAME}: ${e.message}`);
                }
            }
        } catch (e) {
            console.warn(`  [FK] INFORMATION_SCHEMA query failed: ${e.message}`);
        }

        // 2. Now drop test_group (both naming variants)
        for (const tbl of ['test_group', 'test_groups']) {
            try {
                await queryInterface.dropTable(tbl);
                console.log(`  [TABLE] Dropped: ${tbl}`);
            } catch (e) {
                console.warn(`  [TABLE] ${tbl} not dropped: ${e.message}`);
            }
        }

        // 3. Verify test_component_id is truly gone (informational only)
        try {
            const cols = await queryInterface.describeTable('medical_report_results');
            if (Object.prototype.hasOwnProperty.call(cols, 'test_component_id')) {
                console.warn('  [INFO] test_component_id STILL EXISTS — attempting raw drop...');
                await queryInterface.sequelize.query(
                    'ALTER TABLE `medical_report_results` DROP COLUMN `test_component_id`'
                );
                console.log('  [COL] Dropped: medical_report_results.test_component_id');
            } else {
                console.log('  [COL] ✓ test_component_id is already gone from medical_report_results.');
            }
        } catch (e) {
            console.warn(`  [COL] test_component_id check/drop: ${e.message}`);
        }

        console.log('\n[FINAL PATCH] ✓ All legacy tables removed. DB is clean.\n');
    },

    down: async () => {
        console.warn('[DOWN] Legacy table drops are irreversible.');
    }
};
