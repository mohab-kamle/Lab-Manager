'use strict';

/**
 * ARCHITECTURAL CUTOVER — IDEMPOTENT MIGRATION
 * =============================================
 * This migration consolidates all new-architecture changes and destructions into
 * one safe, re-runnable script. Every single action is wrapped in a try/catch
 * with a console.warn so that a partially-applied DB never causes a hard crash.
 *
 * Strategy for column-existence checks (MySQL-safe):
 *   queryInterface.describeTable() returns an object whose keys are column names.
 *   We use `columns.hasOwnProperty(colName)` before ADD/DROP/MODIFY.
 *
 * Strategy for table-existence checks:
 *   We wrap createTable / dropTable in try/catch rather than a pre-check because
 *   MySQL raises a clear "already exists" / "doesn't exist" error.
 *
 * Strategy for FK / constraint drops:
 *   Query INFORMATION_SCHEMA.KEY_COLUMN_USAGE dynamically so we never hard-code
 *   a constraint name that may differ between environments.
 */

// ---------------------------------------------------------------------------
// Helper: returns true if the column exists on a table (safe on missing table)
// ---------------------------------------------------------------------------
async function columnExists(queryInterface, tableName, columnName) {
    try {
        const cols = await queryInterface.describeTable(tableName);
        return Object.prototype.hasOwnProperty.call(cols, columnName);
    } catch (_) {
        // table itself doesn't exist
        return false;
    }
}

// ---------------------------------------------------------------------------
// Helper: returns true if a table exists in the current DB
// ---------------------------------------------------------------------------
async function tableExists(queryInterface, tableName) {
    try {
        await queryInterface.describeTable(tableName);
        return true;
    } catch (_) {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Helper: drop ALL FK constraints whose source column matches, dynamically
// ---------------------------------------------------------------------------
async function dropFKsOnColumn(queryInterface, tableName, columnName) {
    try {
        const [constraints] = await queryInterface.sequelize.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = :tableName
              AND COLUMN_NAME  = :columnName
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `, {
            replacements: { tableName, columnName },
            type: queryInterface.sequelize.QueryTypes.SELECT
        });

        if (!constraints || constraints.length === 0) {
            console.warn(`  [FK] No FK constraints found on ${tableName}.${columnName} — skipping.`);
            return;
        }

        for (const row of constraints) {
            const constraintName = row.CONSTRAINT_NAME;
            try {
                await queryInterface.sequelize.query(
                    `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``
                );
                console.log(`  [FK] Dropped FK ${constraintName} on ${tableName}.${columnName}`);
            } catch (e) {
                console.warn(`  [FK] Could not drop FK ${constraintName}: ${e.message}`);
            }
        }
    } catch (e) {
        console.warn(`  [FK] Could not query INFORMATION_SCHEMA for ${tableName}.${columnName}: ${e.message}`);
    }
}

// ---------------------------------------------------------------------------
// Helper: drop a column only if it exists
// ---------------------------------------------------------------------------
async function safeRemoveColumn(queryInterface, tableName, columnName) {
    if (!(await columnExists(queryInterface, tableName, columnName))) {
        console.warn(`  [COL] Column ${tableName}.${columnName} does not exist — skipping drop.`);
        return;
    }
    try {
        await queryInterface.removeColumn(tableName, columnName);
        console.log(`  [COL] Dropped column ${tableName}.${columnName}`);
    } catch (e) {
        console.warn(`  [COL] Could not drop ${tableName}.${columnName}: ${e.message}`);
    }
}

// ---------------------------------------------------------------------------
// Helper: add a column only if it does NOT already exist
// ---------------------------------------------------------------------------
async function safeAddColumn(queryInterface, tableName, columnName, definition) {
    if (await columnExists(queryInterface, tableName, columnName)) {
        console.warn(`  [COL] Column ${tableName}.${columnName} already exists — skipping add.`);
        return;
    }
    try {
        await queryInterface.addColumn(tableName, columnName, definition);
        console.log(`  [COL] Added column ${tableName}.${columnName}`);
    } catch (e) {
        console.warn(`  [COL] Could not add ${tableName}.${columnName}: ${e.message}`);
    }
}

// ===========================================================================
// MIGRATION
// ===========================================================================
module.exports = {
    // -----------------------------------------------------------------------
    // UP
    // -----------------------------------------------------------------------
    up: async (queryInterface, Sequelize) => {
        // ===================================================================
        // SECTION 1 — CREATE NEW TABLES
        // ===================================================================
        console.log('\n[MIGRATION] Section 1: Creating new tables...');

        // --- global_test_catalog -------------------------------------------
        try {
            await queryInterface.createTable('global_test_catalog', {
                id: {
                    type: Sequelize.STRING(36),
                    primaryKey: true,
                    allowNull: false
                },
                loinc_code: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                name: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                default_structure: {
                    type: Sequelize.JSON,
                    allowNull: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
                }
            });
            console.log('  [TABLE] Created: global_test_catalog');
        } catch (e) {
            console.warn(`  [TABLE] global_test_catalog already exists or failed — skipping. (${e.message})`);
        }

        // --- lab_samples ---------------------------------------------------
        try {
            await queryInterface.createTable('lab_samples', {
                id: {
                    type: Sequelize.STRING(36),
                    primaryKey: true,
                    allowNull: false
                },
                medical_report_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'medical_report', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                barcode: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                specimen_type: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                status: {
                    type: Sequelize.STRING,
                    allowNull: true,
                    defaultValue: 'pending'
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
                }
            });
            console.log('  [TABLE] Created: lab_samples');
        } catch (e) {
            console.warn(`  [TABLE] lab_samples already exists or failed — skipping. (${e.message})`);
        }

        // ===================================================================
        // SECTION 2 — ALTER `test` TABLE
        // ===================================================================
        console.log('\n[MIGRATION] Section 2: Altering `test` table...');

        await safeAddColumn(queryInterface, 'test', 'global_test_id', {
            type: Sequelize.STRING(36),
            allowNull: true,
            references: { model: 'global_test_catalog', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await safeAddColumn(queryInterface, 'test', 'structure_config', {
            type: Sequelize.JSON,
            allowNull: true
        });

        await safeAddColumn(queryInterface, 'test', 'type', {
            type: Sequelize.ENUM('single', 'panel', 'culture'),
            allowNull: false,
            defaultValue: 'single'
        });

        await safeAddColumn(queryInterface, 'test', 'tat_hours', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        // ===================================================================
        // SECTION 3 — ALTER `medical_report_results` TABLE
        // ===================================================================
        console.log('\n[MIGRATION] Section 3: Altering `medical_report_results` table...');

        // Rename the old table if it hasn't been renamed yet
        if (await tableExists(queryInterface, 'medical_report_test_component_result')
            && !(await tableExists(queryInterface, 'medical_report_results'))) {
            try {
                await queryInterface.renameTable(
                    'medical_report_test_component_result',
                    'medical_report_results'
                );
                console.log('  [TABLE] Renamed: medical_report_test_component_result → medical_report_results');
            } catch (e) {
                console.warn(`  [TABLE] Could not rename table: ${e.message}`);
            }
        } else {
            console.warn('  [TABLE] medical_report_results already exists or source table absent — skipping rename.');
        }

        await safeAddColumn(queryInterface, 'medical_report_results', 'test_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'test', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        });

        await safeAddColumn(queryInterface, 'medical_report_results', 'parameter_key', {
            type: Sequelize.STRING,
            allowNull: true
        });

        await safeAddColumn(queryInterface, 'medical_report_results', 'result_value', {
            type: Sequelize.JSON,
            allowNull: true
        });

        // clinical_flag — prefer VARCHAR(50) over ENUM to avoid ALTER TABLE pain
        // when values like 'critical_high' need to be added later.
        await safeAddColumn(queryInterface, 'medical_report_results', 'clinical_flag', {
            type: Sequelize.STRING(50),
            allowNull: true,
            defaultValue: null
        });

        await safeAddColumn(queryInterface, 'medical_report_results', 'workflow_status', {
            type: Sequelize.ENUM('pending', 'collected', 'analyzed', 'approved'),
            allowNull: true,
            defaultValue: 'pending'
        });

        // ===================================================================
        // SECTION 4 — DESTROYER CLEAN-UP (extremely safe)
        // ===================================================================
        console.log('\n[MIGRATION] Section 4: Destroyer clean-up...');

        // 4a. Drop FK + column `test_component_id` from `medical_report_results`
        console.log('  Removing legacy test_component_id from medical_report_results...');
        await dropFKsOnColumn(queryInterface, 'medical_report_results', 'test_component_id');
        await safeRemoveColumn(queryInterface, 'medical_report_results', 'test_component_id');

        // 4b. Drop `result` column from `medical_report_results`
        console.log('  Removing legacy result column from medical_report_results...');
        await safeRemoveColumn(queryInterface, 'medical_report_results', 'result');

        // 4c. Drop `status` column from `medical_report_results`
        console.log('  Removing legacy status column from medical_report_results...');
        await safeRemoveColumn(queryInterface, 'medical_report_results', 'status');

        // 4d. Drop table `test_components` (both singular and plural variants)
        for (const tbl of ['test_component', 'test_components']) {
            if (await tableExists(queryInterface, tbl)) {
                try {
                    // Drop any FKs from other tables pointing at this table before dropping
                    // (medical_report_results.test_component_id was handled above)
                    await queryInterface.dropTable(tbl);
                    console.log(`  [TABLE] Dropped: ${tbl}`);
                } catch (e) {
                    console.warn(`  [TABLE] Could not drop ${tbl}: ${e.message}`);
                }
            } else {
                console.warn(`  [TABLE] ${tbl} does not exist — skipping drop.`);
            }
        }

        // 4e. Drop table `test_group_test` (junction table)
        if (await tableExists(queryInterface, 'test_group_test')) {
            try {
                await queryInterface.dropTable('test_group_test');
                console.log('  [TABLE] Dropped: test_group_test');
            } catch (e) {
                console.warn(`  [TABLE] Could not drop test_group_test: ${e.message}`);
            }
        } else {
            console.warn('  [TABLE] test_group_test does not exist — skipping drop.');
        }

        // 4f. Drop `group_id` FK + column from `test` (points to test_groups)
        console.log('  Removing legacy group_id from test table...');
        await dropFKsOnColumn(queryInterface, 'test', 'group_id');
        await safeRemoveColumn(queryInterface, 'test', 'group_id');

        // 4g. Drop table `test_groups` (both singular and plural)
        for (const tbl of ['test_group', 'test_groups']) {
            if (await tableExists(queryInterface, tbl)) {
                try {
                    await queryInterface.dropTable(tbl);
                    console.log(`  [TABLE] Dropped: ${tbl}`);
                } catch (e) {
                    console.warn(`  [TABLE] Could not drop ${tbl}: ${e.message}`);
                }
            } else {
                console.warn(`  [TABLE] ${tbl} does not exist — skipping drop.`);
            }
        }

        console.log('\n[MIGRATION] ✓ Architectural cutover complete.\n');
    },

    // -----------------------------------------------------------------------
    // DOWN  — reverses the additive changes only; destruction is irreversible
    // -----------------------------------------------------------------------
    down: async (queryInterface, Sequelize) => {
        console.log('\n[MIGRATION DOWN] Reversing additive changes...');

        // Remove new columns from medical_report_results
        for (const col of ['workflow_status', 'clinical_flag', 'result_value', 'parameter_key', 'test_id']) {
            try { await queryInterface.removeColumn('medical_report_results', col); }
            catch (e) { console.warn(`  [DOWN] Could not remove medical_report_results.${col}: ${e.message}`); }
        }

        // Remove new columns from test
        for (const col of ['tat_hours', 'type', 'structure_config', 'global_test_id']) {
            try { await queryInterface.removeColumn('test', col); }
            catch (e) { console.warn(`  [DOWN] Could not remove test.${col}: ${e.message}`); }
        }

        // Drop new tables
        for (const tbl of ['lab_samples', 'global_test_catalog']) {
            try { await queryInterface.dropTable(tbl); }
            catch (e) { console.warn(`  [DOWN] Could not drop ${tbl}: ${e.message}`); }
        }

        console.warn('\n[MIGRATION DOWN] NOTE: Deleted tables (test_components, test_groups, etc.) ' +
            'are NOT restored. That destruction is intentionally irreversible.\n');
    }
};
