'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('global_test_catalog');
    
    const columnsToAdd = [
      { name: 'type', config: { type: Sequelize.ENUM('single', 'panel', 'culture'), allowNull: false, defaultValue: 'single' } },
      { name: 'order_rank', config: { type: Sequelize.INTEGER, allowNull: true } },
      { name: 'patient_friendly_name', config: { type: Sequelize.STRING, allowNull: true } },
      { name: 'global_category', config: { type: Sequelize.STRING, allowNull: true } }
    ];

    return queryInterface.sequelize.transaction(async (t) => {
      for (const col of columnsToAdd) {
        if (!tableInfo[col.name]) {
          await queryInterface.addColumn('global_test_catalog', col.name, col.config, { transaction: t });
        }
      }
    });
  },


  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('global_test_catalog');
    const columnsToRemove = ['type', 'order_rank', 'patient_friendly_name', 'global_category'];

    return queryInterface.sequelize.transaction(async (t) => {
      for (const col of columnsToRemove) {
        if (tableInfo[col]) {
          await queryInterface.removeColumn('global_test_catalog', col, { transaction: t });
        }
      }
    });
  }

};
