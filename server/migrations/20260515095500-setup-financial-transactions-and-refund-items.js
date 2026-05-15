'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create manager_key table if not exists
    try {
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
          references: { model: 'employee', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lab_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lab', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
      console.log("Created table: manager_key");
    } catch (error) {
      console.log("Skipped creating manager_key (already exists?). Error:", error.message);
    }

    // 2. Create financial_transaction table if not exists
    try {
      await queryInterface.createTable('financial_transaction', {
        id: {
          autoIncrement: true,
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
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
          allowNull: true,
          references: { model: 'employee', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        processed_by_type: {
          type: Sequelize.ENUM('admin', 'receptionist', 'system'),
          allowNull: false
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'patient', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        bill_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'bill', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        payment_method_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'payment_method', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        lab_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lab', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'branch', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        manager_key_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'manager_key', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        from: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        to: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        integrity_hash: {
          type: Sequelize.STRING,
          allowNull: true
        },
        refunded_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.0,
        },
        refund_items: {
          type: Sequelize.JSON,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
      console.log("Created table: financial_transaction");
    } catch (error) {
      console.log("Skipped creating financial_transaction (already exists?). Error:", error.message);
      
      // If table exists, try to add refund_items column if missing
      try {
        await queryInterface.addColumn('financial_transaction', 'refund_items', {
          type: Sequelize.JSON,
          allowNull: true
        });
        console.log("Added column: refund_items to existing financial_transaction table");
      } catch (colError) {
        console.log("Skipped adding refund_items (already exists?). Error:", colError.message);
      }
    }

    // 3. Add missing columns to bill table
    try {
      await queryInterface.addColumn('bill', 'change_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      });
      console.log("Added column: change_amount to bill");
    } catch (e) {}

    try {
      await queryInterface.addColumn('bill', 'integrity_hash', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log("Added column: integrity_hash to bill");
    } catch (e) {}

    try {
      await queryInterface.addColumn('bill', 'refunded_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0
      });
      console.log("Added column: refunded_amount to bill");
    } catch (e) {}

    // 4. Add missing columns to bill_has_test and bill_has_package
    try {
      await queryInterface.addColumn('bill_has_test', 'is_refunded', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log("Added column: is_refunded to bill_has_test");
    } catch (e) {}

    try {
      await queryInterface.addColumn('bill_has_package', 'is_refunded', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log("Added column: is_refunded to bill_has_package");
    } catch (e) {}

    // 5. Add missing columns to patient table
    try {
      await queryInterface.addColumn('patient', 'credit', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0
      });
      console.log("Added column: credit to patient");
    } catch (e) {}
  },

  down: async (queryInterface, Sequelize) => {
    try { await queryInterface.removeColumn('patient', 'credit'); } catch (e) {}
    try { await queryInterface.removeColumn('bill_has_package', 'is_refunded'); } catch (e) {}
    try { await queryInterface.removeColumn('bill_has_test', 'is_refunded'); } catch (e) {}
    try { await queryInterface.removeColumn('bill', 'refunded_amount'); } catch (e) {}
    try { await queryInterface.removeColumn('bill', 'integrity_hash'); } catch (e) {}
    try { await queryInterface.removeColumn('bill', 'change_amount'); } catch (e) {}
    await queryInterface.dropTable('financial_transaction');
    await queryInterface.dropTable('manager_key');
  }
};
