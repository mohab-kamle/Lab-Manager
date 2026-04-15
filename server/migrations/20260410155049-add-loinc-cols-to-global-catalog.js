'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // We wrap this in a transaction so if one fails, they all roll back safely
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('global_test_catalog', 'type', {
          type: Sequelize.ENUM('single', 'panel', 'culture'),
          allowNull: false,
          defaultValue: 'single'
        }, { transaction: t }),
        
        queryInterface.addColumn('global_test_catalog', 'order_rank', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction: t }),
        
        queryInterface.addColumn('global_test_catalog', 'patient_friendly_name', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction: t }),
        
        queryInterface.addColumn('global_test_catalog', 'global_category', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction: t })
      ]);
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // If we need to undo this, we remove the columns
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('global_test_catalog', 'type', { transaction: t }),
        queryInterface.removeColumn('global_test_catalog', 'order_rank', { transaction: t }),
        queryInterface.removeColumn('global_test_catalog', 'patient_friendly_name', { transaction: t }),
        queryInterface.removeColumn('global_test_catalog', 'global_category', { transaction: t })
      ]);
    });
  }
};
