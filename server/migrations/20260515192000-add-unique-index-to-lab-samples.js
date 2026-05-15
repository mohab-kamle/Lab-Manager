'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Precheck: Find and delete duplicate (medical_report_id, test_id) pairs, keeping the oldest record
    await queryInterface.sequelize.query(`
      DELETE FROM lab_samples 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT MIN(id) AS id
          FROM lab_samples
          GROUP BY medical_report_id, test_id
        ) AS oldest_samples
      )
    `);

    await queryInterface.addIndex('lab_samples', ['medical_report_id', 'test_id'], {
      unique: true,
      name: 'lab_samples_medical_report_id_test_id_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('lab_samples', 'lab_samples_medical_report_id_test_id_unique');
  }
};
