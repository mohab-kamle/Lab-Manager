'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('lab_payment', 'registration_data', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string containing lab and admin registration data for completion after payment'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('lab_payment', 'registration_data');
  }
};