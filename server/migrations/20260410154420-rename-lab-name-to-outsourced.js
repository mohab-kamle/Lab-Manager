'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
try {
      // Attempt to rename the column
    await queryInterface.renameColumn('test', 'lab_name', 'outsourced_lab_name');
      console.log("✅ Success: Renamed lab_name to outsourced_lab_name");
    } catch (error) {
      // Catch the error if lab_name doesn't exist, log it, and move on
      if (error.message.includes("doesn't have the column")) {
        console.log("⚠️ Warning: Skipped rename. Table 'test' does not have a 'lab_name' column.");
      } else {
        // If it's a different error, throw it
        throw error; 
      }
    }
  },

  async down (queryInterface, Sequelize) {
    try {
    await queryInterface.renameColumn('test', 'outsourced_lab_name', 'lab_name');
    } catch (error) {
      console.log("⚠️ Warning: Skipped rollback. Table 'test' does not have an 'outsourced_lab_name' column.");
    }
  }
};
