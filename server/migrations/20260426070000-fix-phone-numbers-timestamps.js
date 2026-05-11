'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('phone_numbers');
      if (tableInfo.updatedAt && !tableInfo.updated_at) {
        await queryInterface.renameColumn('phone_numbers', 'updatedAt', 'updated_at');
      }
    } catch (error) {
      console.log('ℹ️ Table phone_numbers not found, skipping timestamp fix');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('phone_numbers');
      if (tableInfo.updated_at && !tableInfo.updatedAt) {
        await queryInterface.renameColumn('phone_numbers', 'updated_at', 'updatedAt');
      }
    } catch (error) {
      console.log('ℹ️ Table phone_numbers not found, skipping timestamp rollback');
    }
  }
};
