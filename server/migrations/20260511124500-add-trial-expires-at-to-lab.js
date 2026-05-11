'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('lab');
    if (!tableInfo.trial_expires_at) {
      await queryInterface.addColumn('lab', 'trial_expires_at', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        after: 'subscription_amount'
      });
      console.log('✅ Added trial_expires_at column to lab table');
    } else {
      console.log('ℹ️ trial_expires_at column already exists in lab table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('lab');
    if (tableInfo.trial_expires_at) {
      await queryInterface.removeColumn('lab', 'trial_expires_at');
      console.log('✅ Removed trial_expires_at column from lab table');
    } else {
      console.log('ℹ️ trial_expires_at column does not exist in lab table');
    }
  }
};
