'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add is_owner column to employee table
      await queryInterface.addColumn('employee', 'is_owner', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      
      console.log('Successfully added is_owner column to employee table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('Column is_owner already exists in employee table');
      } else {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('employee', 'is_owner');
      console.log('Successfully removed is_owner column from employee table');
    } catch (error) {
      console.log('Error removing is_owner column:', error.message);
    }
  }
};