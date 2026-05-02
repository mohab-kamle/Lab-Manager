'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
// 1. Create the new manager_key table
    await queryInterface.createTable('manager_key', {
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      key_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      key_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      first_four: {
        type: Sequelize.STRING(4),
        allowNull: false,
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employee',
          key: 'id'
        }
      },
      lab_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab',
          key: 'id'
        }
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });

    // 2. Add manager_key_id to your existing financial_transaction table
    await queryInterface.addColumn('financial_transaction', 'manager_key_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'manager_key',
        key: 'id'
      }
    });

    // 3. Add refunded_amount to the bill table
    await queryInterface.addColumn('bill', 'refunded_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    // 4. Add credit to the patient table
    await queryInterface.addColumn('patient', 'credit', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  },
  async down (queryInterface, Sequelize) {
// If you ever need to rollback, it drops things in reverse order
    await queryInterface.removeColumn('patient', 'credit');
    await queryInterface.removeColumn('bill', 'refunded_amount');
    await queryInterface.removeColumn('financial_transaction', 'manager_key_id');
    await queryInterface.dropTable('manager_key');
  }
};
