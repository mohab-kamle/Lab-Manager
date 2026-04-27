'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('phone_numbers');
    if (!tableInfo.lab_id) {
      await queryInterface.addColumn('phone_numbers', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lab',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('phone_numbers', 'lab_id');
  }
};
