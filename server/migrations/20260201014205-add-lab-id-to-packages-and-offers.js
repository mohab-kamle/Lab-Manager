'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.addColumn('packages_and_offers', 'lab_id', {
                type: Sequelize.INTEGER,
                allowNull: true, // Allow null initially to prevent issues with existing data, can be changed later
                references: {
                    model: 'lab',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            });
            console.log("✅ Added column: packages_and_offers.lab_id");
        } catch (error) {
            console.log("⚠️ Skipped adding lab_id to packages_and_offers (already exists?). Error:", error.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.removeColumn('packages_and_offers', 'lab_id');
            console.log("✅ Removed column: packages_and_offers.lab_id");
        } catch (error) {
            console.log("⚠️ Skipped removing lab_id from packages_and_offers (already removed?). Error:", error.message);
        }
    }
};
