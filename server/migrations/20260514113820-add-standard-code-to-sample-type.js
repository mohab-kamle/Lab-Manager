'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sample_type');

    if (!tableInfo.standard_code) {
      await queryInterface.addColumn('sample_type', 'standard_code', {
        type: Sequelize.STRING(50),
        allowNull: true,
        // Using a named composite index to handle multi-tenancy correctly
        unique: "unique_standard_code_per_lab",
        comment: "Stores the LOINC Part Number or SNOMED CT code"
      });
    }

    if (!tableInfo.tube_color) {
      await queryInterface.addColumn('sample_type', 'tube_color', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "e.g., 'Red', 'Lavender', 'Grey'"
      });
    }

    if (!tableInfo.container_type) {
      await queryInterface.addColumn('sample_type', 'container_type', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "e.g., 'EDTA Tube', 'Serum Separator', 'Sterile Cup'"
      });
    }

    // Ensure lab_id is part of the unique constraint if it's not already
    // Note: If standard_code was already added with unique: true, we might need to drop that index first.
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sample_type');

    if (tableInfo.container_type) {
      await queryInterface.removeColumn('sample_type', 'container_type');
    }
    if (tableInfo.tube_color) {
      await queryInterface.removeColumn('sample_type', 'tube_color');
    }
    if (tableInfo.standard_code) {
      await queryInterface.removeColumn('sample_type', 'standard_code');
    }
  }
};
