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

        // 1. Create global_test_catalog table
        await safeExecute(async () => {
            await queryInterface.createTable('global_test_catalog', {
                id: {
                    type: Sequelize.STRING(36),
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: Sequelize.UUIDV4
                },
                loinc_code: {
                    type: Sequelize.STRING(20),
                    allowNull: true,
                    unique: true
                },
                name: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                default_structure: {
                    type: Sequelize.JSON,
                    allowNull: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.fn('now')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.fn('now')
                }
            });
        }, 'Create global_test_catalog table');

        // 2. Create lab_samples table
        await safeExecute(async () => {
            await queryInterface.createTable('lab_samples', {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                    allowNull: false
                },
                sample_id: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    unique: true
                },
                medical_report_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                status: {
                    type: Sequelize.STRING(50),
                    allowNull: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.fn('now')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.fn('now')
                }
            });
        }, 'Create lab_samples table');

        // 3. Alter test Table
        const testTableInfo = await queryInterface.describeTable('test').catch(() => ({}));

        if (!testTableInfo.global_test_id) {
            await safeExecute(() => queryInterface.addColumn('test', 'global_test_id', {
                type: Sequelize.STRING(36),
                allowNull: true
            }), 'Add global_test_id column to test table');
        }

        if (!testTableInfo.structure_config) {
            await safeExecute(() => queryInterface.addColumn('test', 'structure_config', {
                type: Sequelize.JSON,
                allowNull: true
            }), 'Add structure_config column to test table');
        }

        await safeExecute(async () => {
            await queryInterface.sequelize.query(
                "ALTER TABLE `test` MODIFY COLUMN `type` ENUM('single', 'panel', 'culture') NOT NULL DEFAULT 'single';"
            );
        }, 'Modify type ENUM in test table to include culture');

        if (!testTableInfo.tat_hours) {
            await safeExecute(() => queryInterface.addColumn('test', 'tat_hours', {
                type: Sequelize.INTEGER,
                allowNull: true
            }), 'Add tat_hours column to test table');
        }

        // 4. Alter medical_report_results Table
        const mrrTableInfo = await queryInterface.describeTable('medical_report_results').catch(async () => {
            await safeExecute(() => queryInterface.renameTable('medical_report_test_component_result', 'medical_report_results'), 'Rename medical_report_test_component_result to medical_report_results');
            return await queryInterface.describeTable('medical_report_results').catch(() => ({}));
        });

        if (mrrTableInfo && (!mrrTableInfo.test_id)) {
            await safeExecute(() => queryInterface.addColumn('medical_report_results', 'test_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'test',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            }), 'Add test_id column to medical_report_results table');
        }

        if (mrrTableInfo && (!mrrTableInfo.parameter_key)) {
            await safeExecute(() => queryInterface.addColumn('medical_report_results', 'parameter_key', {
                type: Sequelize.STRING(255),
                allowNull: true
            }), 'Add parameter_key column to medical_report_results table');
        }

        if (mrrTableInfo && (!mrrTableInfo.result_value)) {
            await safeExecute(() => queryInterface.addColumn('medical_report_results', 'result_value', {
                type: Sequelize.JSON,
                allowNull: true
            }), 'Add result_value column to medical_report_results table');
        }

        if (mrrTableInfo && (!mrrTableInfo.clinical_flag)) {
            await safeExecute(() => queryInterface.addColumn('medical_report_results', 'clinical_flag', {
                type: Sequelize.ENUM('normal', 'low', 'high', 'panic_low', 'panic_high'),
                allowNull: true
            }), 'Add clinical_flag column to medical_report_results table');
        }

        if (mrrTableInfo && (!mrrTableInfo.workflow_status)) {
            await safeExecute(() => queryInterface.addColumn('medical_report_results', 'workflow_status', {
                type: Sequelize.ENUM('pending', 'collected', 'analyzed', 'approved'),
                allowNull: true,
                defaultValue: 'pending'
            }), 'Add workflow_status column to medical_report_results table');
        }
    },

    down: async (queryInterface, Sequelize) => {
        const safeExecute = async (operation, description) => {
            try {
                await operation();
                console.log(`✅ Success: ${description}`);
            } catch (error) {
                console.warn(`⚠️ Warning: Failed to ${description}. Reason: ${error.message}`);
            }
        };

        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'workflow_status'), 'Remove workflow_status from medical_report_results');
        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'clinical_flag'), 'Remove clinical_flag from medical_report_results');
        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'result_value'), 'Remove result_value from medical_report_results');
        await safeExecute(() => queryInterface.removeColumn('medical_report_results', 'parameter_key'), 'Remove parameter_key from medical_report_results');
        await safeExecute(async () => {
            // Best-effort to drop FK constraint before the column
            const constraints = await queryInterface.showConstraint('medical_report_results');
            const fkConstraint = constraints.find(c => c.columnNames && c.columnNames.includes('test_id') && c.constraintType === 'FOREIGN KEY');
            if (fkConstraint && fkConstraint.constraintName) {
                await queryInterface.removeConstraint('medical_report_results', fkConstraint.constraintName);
            }
            await queryInterface.removeColumn('medical_report_results', 'test_id');
        }, 'Remove test_id from medical_report_results');

        await safeExecute(() => queryInterface.renameTable('medical_report_results', 'medical_report_test_component_result'), 'Rename medical_report_results back to medical_report_test_component_result');

        await safeExecute(() => queryInterface.removeColumn('test', 'tat_hours'), 'Remove tat_hours from test');

        await safeExecute(async () => {
            await queryInterface.sequelize.query(
                "ALTER TABLE `test` MODIFY COLUMN `type` ENUM('single', 'panel') NOT NULL DEFAULT 'single';"
            );
        }, 'Revert type ENUM in test table');

        await safeExecute(() => queryInterface.removeColumn('test', 'structure_config'), 'Remove structure_config from test');
        await safeExecute(() => queryInterface.removeColumn('test', 'global_test_id'), 'Remove global_test_id from test');

        await safeExecute(() => queryInterface.dropTable('lab_samples'), 'Drop lab_samples table');
        await safeExecute(() => queryInterface.dropTable('global_test_catalog'), 'Drop global_test_catalog table');
    }
};
