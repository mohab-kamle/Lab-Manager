'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
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
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('packages_and_offers', 'lab_id');
    }
};
