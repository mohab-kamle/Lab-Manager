'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('lab_samples', ['medical_report_id', 'test_id'], {
      unique: true,
      name: 'lab_samples_medical_report_id_test_id_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('lab_samples', 'lab_samples_medical_report_id_test_id_unique');
  }
};
