'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('phone_numbers', 'updatedAt', 'updated_at');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('phone_numbers', 'updated_at', 'updatedAt');
  }
};
