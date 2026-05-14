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

    // 1. Categories Table
    await safeExecute(async () => {
      await queryInterface.addColumn('categories_test_and_culture', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lab', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }, 'Add lab_id to categories table');

    await safeExecute(async () => {
      await queryInterface.removeIndex('categories_test_and_culture', 'name_UNIQUE');
    }, 'Remove old category name index');

    await safeExecute(async () => {
      await queryInterface.addIndex('categories_test_and_culture', ['lab_id', 'name'], {
        unique: true,
        name: 'unique_category_name_per_lab'
      });
    }, 'Add composite unique index to categories');

    // 2. Sample Type Table
    await safeExecute(async () => {
      await queryInterface.addColumn('sample_type', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lab', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }, 'Add lab_id to sample_type table');

    await safeExecute(async () => {
      await queryInterface.removeIndex('sample_type', 'type_UNIQUE');
    }, 'Remove old sample type index');

    await safeExecute(async () => {
      await queryInterface.addIndex('sample_type', ['lab_id', 'type'], {
        unique: true,
        name: 'unique_sample_type_per_lab'
      });
    }, 'Add composite unique index to sample_type');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert categories
    await queryInterface.removeIndex('categories_test_and_culture', 'unique_category_name_per_lab');
    await queryInterface.addIndex('categories_test_and_culture', ['name'], { unique: true, name: 'name_UNIQUE' });
    await queryInterface.removeColumn('categories_test_and_culture', 'lab_id');

    // Revert sample_type
    await queryInterface.removeIndex('sample_type', 'unique_sample_type_per_lab');
    await queryInterface.addIndex('sample_type', ['type'], { unique: true, name: 'type_UNIQUE' });
    await queryInterface.removeColumn('sample_type', 'lab_id');
  }
};
