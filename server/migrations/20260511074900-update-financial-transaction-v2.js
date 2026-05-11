'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update bill table
    const billTable = await queryInterface.describeTable('bill');
    if (!billTable.change_amount) {
      await queryInterface.addColumn('bill', 'change_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Amount returned to patient in case of overpayment'
      });
    }

    // 2. Update financial_transaction table
    const ftTable = await queryInterface.describeTable('financial_transaction');
    
    if (!ftTable.from) {
      await queryInterface.addColumn('financial_transaction', 'from', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Source of the transaction'
      });
    }

    if (!ftTable.to) {
      await queryInterface.addColumn('financial_transaction', 'to', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Destination of the transaction'
      });
    }

    // 3. Cleanup: Remove columns if they exist
    if (ftTable.processed_by_type) {
      await queryInterface.removeColumn('financial_transaction', 'processed_by_type');
    }
  },

  async down (queryInterface, Sequelize) {
    // We add try-catch or checks in down as well for safety
    try {
        await queryInterface.removeColumn('bill', 'change_amount');
    } catch (e) {}
    try {
        await queryInterface.removeColumn('financial_transaction', 'from');
    } catch (e) {}
    try {
        await queryInterface.removeColumn('financial_transaction', 'to');
    } catch (e) {}
  }
};
