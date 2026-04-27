'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('phone_numbers');

    // 1. Fix updatedAt -> updated_at
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      await queryInterface.renameColumn('phone_numbers', 'updatedAt', 'updated_at');
    } else if (!tableInfo.updated_at) {
      await queryInterface.addColumn('phone_numbers', 'updated_at', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      });
    }

    // 2. Add doctor_id if missing
    if (!tableInfo.doctor_id) {
      await queryInterface.addColumn('phone_numbers', 'doctor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'doctor',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    // 3. Add supplier_id if missing
    if (!tableInfo.supplier_id) {
      await queryInterface.addColumn('phone_numbers', 'supplier_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'supplier',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    // 4. Add lab_id if missing
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
    // Reversing these changes if needed
    await queryInterface.renameColumn('phone_numbers', 'updated_at', 'updatedAt');
    await queryInterface.removeColumn('phone_numbers', 'doctor_id');
    await queryInterface.removeColumn('phone_numbers', 'supplier_id');
    await queryInterface.removeColumn('phone_numbers', 'lab_id');
  }
};
