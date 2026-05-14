'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('global_test_catalog');
    if (!tableInfo.default_sample_type_id) {
      await queryInterface.addColumn('global_test_catalog', 'default_sample_type_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sample_type',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('global_test_catalog');
    if (tableInfo.default_sample_type_id) {
      await queryInterface.removeColumn('global_test_catalog', 'default_sample_type_id');
    }
  }
};
