'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('bill_has_test', 'signature', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log("Added column: signature to bill_has_test");
    } catch (error) {
      console.log("Skipped adding signature to bill_has_test (already exists?). Error:", error.message);
    }

    try {
      await queryInterface.addColumn('bill_has_package', 'signature', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log("Added column: signature to bill_has_package");
    } catch (error) {
      console.log("Skipped adding signature to bill_has_package (already exists?). Error:", error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('bill_has_test', 'signature');
    } catch (error) {
      console.log("Error removing signature from bill_has_test:", error.message);
    }

    try {
      await queryInterface.removeColumn('bill_has_package', 'signature');
    } catch (error) {
      console.log("Error removing signature from bill_has_package:", error.message);
    }
  }
};
