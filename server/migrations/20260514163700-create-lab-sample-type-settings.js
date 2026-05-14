'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists before creating
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('lab_sample_type_settings')) {
      await queryInterface.createTable('lab_sample_type_settings', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        lab_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'lab',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        sample_type_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'sample_type',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        tube_color: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        container_type: {
          type: Sequelize.STRING(255),
          allowNull: true
        }
      });

      // Add composite unique index
      await queryInterface.addIndex('lab_sample_type_settings', ['lab_id', 'sample_type_id'], {
        unique: true,
        name: 'unique_lab_sample_type'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('lab_sample_type_settings')) {
      await queryInterface.dropTable('lab_sample_type_settings');
    }
  }
};
