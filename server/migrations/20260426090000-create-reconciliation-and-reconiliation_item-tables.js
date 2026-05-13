'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create the reconciliation table (The Payment Header)
    try {
      await queryInterface.createTable('reconciliation', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'patient',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT' // Protects patient from deletion if they have financial history
        },
        lab_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'lab',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Total payment received'
        },
        payment_method_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'payment_method',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
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
      console.log('✅ Created table: reconciliation');
    } catch (e) {
      console.log('⚠️ table reconciliation already exists');
    }

    // 2. Create the reconciliation_item table (The Distribution Links)
    try {
      await queryInterface.createTable('reconciliation_item', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        reconciliation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'reconciliation',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE' // If the main payment drops, drop the links
        },
        bill_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'bill',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT' // Protects the bill from deletion if it has payments
        },
        amount_applied: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Amount from the reconciliation applied to this specific bill'
        }
      });
      console.log('✅ Created table: reconciliation_item');
    } catch (e) {
      console.log('⚠️ table reconciliation_item already exists');
    }

    // 3. Add Indexes to speed up lookups (e.g., finding all items for a bill or patient)
    try { await queryInterface.addIndex('reconciliation', ['patient_id']); } catch (e) { }
    try { await queryInterface.addIndex('reconciliation', ['lab_id']); } catch (e) { }
    try { await queryInterface.addIndex('reconciliation_item', ['reconciliation_id']); } catch (e) { }
    try { await queryInterface.addIndex('reconciliation_item', ['bill_id']); } catch (e) { }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop in reverse order to avoid foreign key constraint errors
    await queryInterface.dropTable('reconciliation_item');
    await queryInterface.dropTable('reconciliation');
  }
};
