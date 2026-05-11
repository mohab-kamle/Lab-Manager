'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
<<<<<<< HEAD
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.renameColumn('test', 'lab_name', 'outsourced_lab_name');
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.renameColumn('test', 'outsourced_lab_name', 'lab_name');
  }
=======
    try {
      const tableInfo = await queryInterface.describeTable('test');
      if (tableInfo.lab_name && !tableInfo.outsourced_lab_name) {
        await queryInterface.renameColumn('test', 'lab_name', 'outsourced_lab_name');
      }
    } catch (error) {
      console.log('Skipped renameColumn lab_name to outsourced_lab_name (already renamed or table missing)');
    }
  },


  async down (queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('test');
      if (tableInfo.outsourced_lab_name && !tableInfo.lab_name) {
        await queryInterface.renameColumn('test', 'outsourced_lab_name', 'lab_name');
      }
    } catch (error) {
      console.log('Skipped renameColumn outsourced_lab_name to lab_name');
    }
  }

>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
};
