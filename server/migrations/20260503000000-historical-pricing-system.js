'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add integrity columns to bills table
    await queryInterface.addColumn('bill', 'integrity_hash', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Add signature and refund status to bill_has_test
    await queryInterface.addColumn('bill_has_test', 'signature', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('bill_has_test', 'is_refunded', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    // Add signature and refund status to bill_has_package
    await queryInterface.addColumn('bill_has_package', 'signature', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('bill_has_package', 'is_refunded', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bills', 'integrity_hash');
    await queryInterface.removeColumn('bill_has_test', 'signature');
    await queryInterface.removeColumn('bill_has_test', 'is_refunded');
    await queryInterface.removeColumn('bill_has_package', 'signature');
    await queryInterface.removeColumn('bill_has_package', 'is_refunded');
  }
};
