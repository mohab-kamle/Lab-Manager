"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // ─── 1. Create global_test_catalog table ───────────────────────────
        try {
            await queryInterface.createTable("global_test_catalog", {
                id: {
                    type: Sequelize.STRING(36),
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: Sequelize.UUIDV4,
                },
                loinc_code: {
                    type: Sequelize.STRING(20),
                    allowNull: true,
                    unique: "loinc_code_UNIQUE",
                },
                name: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                },
                default_structure: {
                    type: Sequelize.JSON,
                    allowNull: true,
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal(
                        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
                    ),
                },
            }, {
                charset: 'latin1',
                collate: 'latin1_swedish_ci',
                engine: 'InnoDB',
            });
            console.log("✅ Created table: global_test_catalog");
        } catch (err) {
            console.warn(
                "⚠️  Could not create global_test_catalog:",
                err.message
            );
        }

        // ─── 2. Add columns to existing `test` table ───────────────────────

        // 2a. global_test_id (FK to global_test_catalog)
        try {
            await queryInterface.addColumn("test", "global_test_id", {
                type: Sequelize.STRING(36),
                allowNull: true,
                references: {
                    model: "global_test_catalog",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            });
            console.log("✅ Added column: test.global_test_id");
        } catch (err) {
            console.warn("⚠️  Could not add test.global_test_id:", err.message);
        }

        // 2b. structure_config (JSON)
        try {
            await queryInterface.addColumn("test", "structure_config", {
                type: Sequelize.JSON,
                allowNull: true,
            });
            console.log("✅ Added column: test.structure_config");
        } catch (err) {
            console.warn(
                "⚠️  Could not add test.structure_config:",
                err.message
            );
        }

        // 2c. type (ENUM)
        try {
            await queryInterface.addColumn("test", "type", {
                type: Sequelize.ENUM("single", "panel"),
                allowNull: false,
                defaultValue: "single",
            });
            console.log("✅ Added column: test.type");
        } catch (err) {
            console.warn("⚠️  Could not add test.type:", err.message);
        }

        // 2d. tat_hours (INTEGER)
        try {
            await queryInterface.addColumn("test", "tat_hours", {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
            console.log("✅ Added column: test.tat_hours");
        } catch (err) {
            console.warn("⚠️  Could not add test.tat_hours:", err.message);
        }

        // 2e. Add index on global_test_id
        try {
            await queryInterface.addIndex("test", ["global_test_id"], {
                name: "fk_test_global_test_catalog_idx",
            });
            console.log("✅ Added index: fk_test_global_test_catalog_idx");
        } catch (err) {
            console.warn(
                "⚠️  Could not add index fk_test_global_test_catalog_idx:",
                err.message
            );
        }
    },

    async down(queryInterface, Sequelize) {
        // Reverse in opposite order

        try {
            await queryInterface.removeIndex(
                "test",
                "fk_test_global_test_catalog_idx"
            );
            console.log("✅ Removed index: fk_test_global_test_catalog_idx");
        } catch (err) {
            console.warn(
                "⚠️  Could not remove index fk_test_global_test_catalog_idx:",
                err.message
            );
        }

        try {
            await queryInterface.removeColumn("test", "tat_hours");
            console.log("✅ Removed column: test.tat_hours");
        } catch (err) {
            console.warn("⚠️  Could not remove test.tat_hours:", err.message);
        }

        try {
            await queryInterface.removeColumn("test", "type");
            console.log("✅ Removed column: test.type");
        } catch (err) {
            console.warn("⚠️  Could not remove test.type:", err.message);
        }

        try {
            await queryInterface.removeColumn("test", "structure_config");
            console.log("✅ Removed column: test.structure_config");
        } catch (err) {
            console.warn(
                "⚠️  Could not remove test.structure_config:",
                err.message
            );
        }

        try {
            await queryInterface.removeColumn("test", "global_test_id");
            console.log("✅ Removed column: test.global_test_id");
        } catch (err) {
            console.warn(
                "⚠️  Could not remove test.global_test_id:",
                err.message
            );
        }

        try {
            await queryInterface.dropTable("global_test_catalog");
            console.log("✅ Dropped table: global_test_catalog");
        } catch (err) {
            console.warn(
                "⚠️  Could not drop global_test_catalog:",
                err.message
            );
        }
    },
};
