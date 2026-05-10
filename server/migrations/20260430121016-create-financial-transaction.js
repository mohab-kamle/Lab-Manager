'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
await queryInterface.createTable('financial_transaction', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      transaction_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      process_type: {
        type: Sequelize.ENUM('Payment', 'Refund', 'Due', 'Credit'),
        allowNull: false
      },
      processed_by_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Remains true so the system can generate events
        references: {
          model: 'employee', // Make sure this perfectly matches your employee table name in MySQL
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'patient', // Ensure this matches your actual patients table name
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      bill_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bill', // Ensure this matches your actual bills table name
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      payment_method_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'payment_method', // Ensure this matches your actual table name
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      lab_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab', // Ensure this matches your actual labs table name
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'branch', // Ensure this matches your actual branches table name
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('financial_transaction');
  }
};
