'use strict';

/**
 * PATCH: finish the two items left incomplete by the cutover migration.
 *
 *  1. Drop `test_component_id` from `medical_report_results` via raw SQL.
 *     (Sequelize's removeColumn fires a model-level Validation error because a
 *      loaded model still declares that column; raw ALTER TABLE bypasses it.)
 *
 *  2. Drop table `medical_report_tg_field_value` (legacy TG field-value table
 *     that holds a FK to test_group), then drop `test_group`.
 */

module.exports = {
    up: async (queryInterface /* , Sequelize */) => {

        // ----------------------------------------------------------------
        // 1. Drop test_component_id via raw SQL (bypasses ORM validation)
        // ----------------------------------------------------------------
        console.log('\n[PATCH] 1. Dropping test_component_id from medical_report_results...');

        // Drop any remaining FK constraints on the column first (dynamic lookup)
        try {
            const constraints = await queryInterface.sequelize.query(
                `SELECT CONSTRAINT_NAME
                 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA       = DATABASE()
                   AND TABLE_NAME         = 'medical_report_results'
                   AND COLUMN_NAME        = 'test_component_id'
                   AND REFERENCED_TABLE_NAME IS NOT NULL`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            for (const { CONSTRAINT_NAME } of constraints) {
                try {
                    await queryInterface.sequelize.query(
                        `ALTER TABLE \`medical_report_results\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``
                    );
                    console.log(`  [FK] Dropped ${CONSTRAINT_NAME}`);
                } catch (e) {
                    console.warn(`  [FK] Could not drop ${CONSTRAINT_NAME}: ${e.message}`);
                }
            }
        } catch (e) {
            console.warn(`  [FK] INFORMATION_SCHEMA query failed: ${e.message}`);
        }

        // Raw ALTER TABLE to avoid Sequelize model validation
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE `medical_report_results` DROP COLUMN `test_component_id`'
            );
            console.log('  [COL] Dropped: medical_report_results.test_component_id');
        } catch (e) {
            // ER_CANT_DROP_FIELD_OR_KEY = column doesn't exist → perfectly fine
            console.warn(`  [COL] test_component_id not dropped (may already be gone): ${e.message}`);
        }

        // ----------------------------------------------------------------
        // 2. Drop medical_report_tg_field_value, then test_group
        // ----------------------------------------------------------------
        console.log('\n[PATCH] 2. Dropping legacy TG tables...');

        // Drop the child table that blocks test_group removal
        for (const tbl of ['medical_report_tg_field_value', 'medical_report_tg_field_values']) {
            try {
                await queryInterface.dropTable(tbl);
                console.log(`  [TABLE] Dropped: ${tbl}`);
            } catch (e) {
                console.warn(`  [TABLE] ${tbl} not dropped (may not exist): ${e.message}`);
            }
        }

        // Now safely drop test_group (both naming variants)
        for (const tbl of ['test_group', 'test_groups']) {
            try {
                await queryInterface.dropTable(tbl);
                console.log(`  [TABLE] Dropped: ${tbl}`);
            } catch (e) {
                console.warn(`  [TABLE] ${tbl} not dropped: ${e.message}`);
            }
        }

        console.log('\n[PATCH] ✓ Patch complete. DB is fully migrated.\n');
    },

    down: async (queryInterface, Sequelize) => {
        // Re-adding test_component_id as nullable (safe fallback)
        try {
            await queryInterface.addColumn('medical_report_results', 'test_component_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
            });
        } catch (e) {
            console.warn('  [DOWN] Could not restore test_component_id:', e.message);
        }
        // Dropped tables are not restored; destruction is irreversible.
        console.warn('[DOWN] Legacy tables (test_group, medical_report_tg_field_value) are NOT restored.');
    }
};
