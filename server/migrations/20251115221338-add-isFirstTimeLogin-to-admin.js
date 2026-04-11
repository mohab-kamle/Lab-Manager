'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('admin', 'isFirstTimeLogin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true // new admins will start as "first time login"
      });
      console.log("✅ Added column: admin.isFirstTimeLogin");
    } catch (error) {
      console.log("⚠️ Skipped adding isFirstTimeLogin to admin (already exists?). Error:", error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('admin', 'isFirstTimeLogin');
      console.log("✅ Removed column: admin.isFirstTimeLogin");
    } catch (error) {
      console.log("⚠️ Skipped removing isFirstTimeLogin (already removed?). Error:", error.message);
    }
  }
};
