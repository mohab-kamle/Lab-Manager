'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const safeExecute = async (operation, description) => {
      try {
        await operation();
        console.log(`✅ Success: ${description}`);
      } catch (error) {
        console.warn(`⚠️ Warning: Failed to ${description}. Reason: ${error.message}`);
      }
    };

    await safeExecute(async () => {
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
    }, 'Create lab_sample_type_settings table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('lab_sample_type_settings');
  }
};
