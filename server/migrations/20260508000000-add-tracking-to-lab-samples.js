'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // We add test_id, sample_type_id, status_history to lab_samples
    // We also modify status to have default value "Pending Collection"
    await queryInterface.addColumn('lab_samples', 'test_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null initially for existing rows
      references: {
        model: 'test',
        key: 'id'
      }
    });
    await queryInterface.addColumn('lab_samples', 'sample_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'sample_type',
        key: 'id'
      }
    });
    await queryInterface.addColumn('lab_samples', 'status_history', {
      type: Sequelize.JSON,
      allowNull: true
    });
    
    await queryInterface.sequelize.query(`UPDATE lab_samples SET status = 'Pending Collection' WHERE status IS NULL`);

    await queryInterface.changeColumn('lab_samples', 'status', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'Pending Collection'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('lab_samples', 'test_id');
    await queryInterface.removeColumn('lab_samples', 'sample_type_id');
    await queryInterface.removeColumn('lab_samples', 'status_history');
    
    // Note: Reverting a default value requires changing the column back
    await queryInterface.changeColumn('lab_samples', 'status', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  }
};