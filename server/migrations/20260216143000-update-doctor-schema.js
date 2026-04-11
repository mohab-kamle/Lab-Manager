"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Example: add username safely
        try {
            await queryInterface.addColumn('doctor', 'username', {
                type: Sequelize.STRING(45),
                allowNull: true,
                unique: "username_UNIQUE"
            });
            console.log("✅ Added column: username");
        } catch (err) {
            console.warn("⚠️ Could not add username:", err.message);
        }

        // Example: add password safely
        try {
            await queryInterface.addColumn('doctor', 'password', {
                type: Sequelize.STRING(255),
                allowNull: true
            });
            console.log("✅ Added column: password");
        } catch (err) {
            console.warn("⚠️ Could not add password:", err.message);
        }

        // Example: remove lab_id foreign key + column safely
        try {
            const constraints = await queryInterface.getForeignKeyReferencesForTable('doctor');
            const labFk = constraints.find(c => c.columnName === 'lab_id');
            if (labFk) {
                await queryInterface.removeConstraint('doctor', labFk.constraintName);
                console.log("✅ Removed FK constraint on lab_id");
            }
        } catch (err) {
            console.warn("⚠️ Could not remove lab_id FK:", err.message);
        }

        try {
            await queryInterface.removeColumn('doctor', 'lab_id');
            console.log("✅ Removed column: lab_id");
        } catch (err) {
            console.warn("⚠️ Could not remove lab_id column:", err.message);
        }
    },

    async down(queryInterface, Sequelize) {
        // Reverse operations safely

        try {
            await queryInterface.addColumn('doctor', 'lab_id', {
                type: Sequelize.INTEGER,
                references: {
                    model: 'lab',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
            console.log("✅ Restored column: lab_id");
        } catch (err) {
            console.warn("⚠️ Could not restore lab_id:", err.message);
        }

        try {
            await queryInterface.removeColumn('doctor', 'password');
            console.log("✅ Removed column: password");
        } catch (err) {
            console.warn("⚠️ Could not remove password:", err.message);
        }

        try {
            await queryInterface.removeColumn('doctor', 'username');
            console.log("✅ Removed column: username");
        } catch (err) {
            console.warn("⚠️ Could not remove username:", err.message);
        }
    }
};
