'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sample_type');

    if (!tableInfo.standard_code) {
      await queryInterface.addColumn('sample_type', 'standard_code', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sample_type', 'container_type');
    await queryInterface.removeColumn('sample_type', 'tube_color');
    await queryInterface.removeColumn('sample_type', 'standard_code');
  }
};
