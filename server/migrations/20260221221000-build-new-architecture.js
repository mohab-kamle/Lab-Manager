'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Create a new table global_test_catalog
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
            console.log("Created table: global_test_catalog");
        } catch (error) {
            console.log("Skipped creating global_test_catalog (already exists?). Error:", error.message);
        }

        // 2. Create a new table lab_samples
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
            console.log("Created table: lab_samples");
        } catch (error) {
            console.log("Skipped creating lab_samples (already exists?). Error:", error.message);
        }

        // 3. Alter the existing test table
        try {
            await queryInterface.addColumn('test', 'global_test_id', {
                type: Sequelize.STRING(36),
                allowNull: true,
                references: { model: 'global_test_catalog', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
            console.log("Added column: global_test_id to test table");
        } catch (error) {
            console.log("Skipped adding global_test_id to test (already exists?). Error:", error.message);
        }

        try {
            await queryInterface.addColumn('test', 'structure_config', {
                type: Sequelize.JSON,
                allowNull: true
            });
            console.log("Added column: structure_config to test table");
        } catch (error) {
            console.log("Skipped adding structure_config to test (already exists?). Error:", error.message);
        }

        try {
            await queryInterface.addColumn('test', 'type', {
                type: Sequelize.ENUM('single', 'panel', 'culture'),
                allowNull: false,
                defaultValue: 'single'
            });
            console.log("Added column: type to test table");
        } catch (error) {
            console.log("Skipped adding type to test (already exists?). Error:", error.message);
        }

        // 4. Alter the existing medical_report_test_component_result table
        try {
            await queryInterface.renameTable('medical_report_test_component_result', 'medical_report_results');
            console.log("Renamed table: medical_report_test_component_result -> medical_report_results");
        } catch (error) {
            console.log("Skipped renaming table (might be renamed already). Error:", error.message);
        }

        // Notice we use the NEW table name if renaming succeeded, or the NEW name if it was already renamed. 
        // If renaming failed but the table already exists under 'medical_report_results', these will work.
        try {
            await queryInterface.addColumn('medical_report_results', 'test_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'test', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            });
            console.log("Added column: test_id to medical_report_results");
        } catch (error) {
            console.log("Skipped adding test_id to medical_report_results. Error:", error.message);
        }

        try {
            await queryInterface.addColumn('medical_report_results', 'parameter_key', {
                type: Sequelize.STRING,
                allowNull: true
            });
            console.log("Added column: parameter_key to medical_report_results");
        } catch (error) {
            console.log("Skipped adding parameter_key to medical_report_results. Error:", error.message);
        }

        try {
            await queryInterface.addColumn('medical_report_results', 'result_value', {
                type: Sequelize.JSON,
                allowNull: true
            });
            console.log("Added column: result_value to medical_report_results");
        } catch (error) {
            console.log("Skipped adding result_value to medical_report_results. Error:", error.message);
        }

        try {
            await queryInterface.addColumn('medical_report_results', 'clinical_flag', {
                type: Sequelize.ENUM('normal', 'low', 'high', 'panic_low', 'panic_high'),
                allowNull: true
            });
            console.log("Added column: clinical_flag to medical_report_results");
        } catch (error) {
            console.log("Skipped adding clinical_flag to medical_report_results. Error:", error.message);
        }

        try {
            await queryInterface.addColumn('medical_report_results', 'workflow_status', {
                type: Sequelize.ENUM('pending', 'collected', 'analyzed', 'approved'),
                allowNull: true,
                defaultValue: 'pending'
            });
            console.log("Added column: workflow_status to medical_report_results");
        } catch (error) {
            console.log("Skipped adding workflow_status to medical_report_results. Error:", error.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try { await queryInterface.removeColumn('medical_report_results', 'workflow_status'); } catch (e) { }
        try { await queryInterface.removeColumn('medical_report_results', 'clinical_flag'); } catch (e) { }
        try { await queryInterface.removeColumn('medical_report_results', 'result_value'); } catch (e) { }
        try { await queryInterface.removeColumn('medical_report_results', 'parameter_key'); } catch (e) { }
        try { await queryInterface.removeColumn('medical_report_results', 'test_id'); } catch (e) { }
        try { await queryInterface.renameTable('medical_report_results', 'medical_report_test_component_result'); } catch (e) { }
        try { await queryInterface.removeColumn('test', 'type'); } catch (e) { }
        try { await queryInterface.removeColumn('test', 'structure_config'); } catch (e) { }
        try { await queryInterface.removeColumn('test', 'global_test_id'); } catch (e) { }
        try { await queryInterface.dropTable('lab_samples'); } catch (e) { }
        try { await queryInterface.dropTable('global_test_catalog'); } catch (e) { }
    }
};
