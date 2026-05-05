'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
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

};
