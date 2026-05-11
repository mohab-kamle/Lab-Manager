'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
<<<<<<< HEAD
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
=======
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

>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
};
