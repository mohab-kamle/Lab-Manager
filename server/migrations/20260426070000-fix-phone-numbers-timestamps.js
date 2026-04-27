'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('phone_numbers');
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      await queryInterface.renameColumn('phone_numbers', 'updatedAt', 'updated_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('phone_numbers');
    if (tableInfo.updated_at && !tableInfo.updatedAt) {
      await queryInterface.renameColumn('phone_numbers', 'updated_at', 'updatedAt');
    }
  }
};
