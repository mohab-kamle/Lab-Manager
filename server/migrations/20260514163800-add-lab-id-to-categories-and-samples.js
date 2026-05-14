'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Categories Table
    const catTableInfo = await queryInterface.describeTable('categories_test_and_culture');
    const catIndices = await queryInterface.showIndex('categories_test_and_culture');

    if (!catTableInfo.lab_id) {
      await queryInterface.addColumn('categories_test_and_culture', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lab', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    if (catIndices.some(idx => idx.name === 'name_UNIQUE')) {
      await queryInterface.removeIndex('categories_test_and_culture', 'name_UNIQUE');
    }

    if (!catIndices.some(idx => idx.name === 'unique_category_name_per_lab')) {
      await queryInterface.addIndex('categories_test_and_culture', ['lab_id', 'name'], {
        unique: true,
        name: 'unique_category_name_per_lab'
      });
    }

    // 2. Sample Type Table
    const sampleTableInfo = await queryInterface.describeTable('sample_type');
    const sampleIndices = await queryInterface.showIndex('sample_type');

    if (!sampleTableInfo.lab_id) {
      await queryInterface.addColumn('sample_type', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lab', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    if (sampleIndices.some(idx => idx.name === 'type_UNIQUE')) {
      await queryInterface.removeIndex('sample_type', 'type_UNIQUE');
    }

    if (!sampleIndices.some(idx => idx.name === 'unique_sample_type_per_lab')) {
      await queryInterface.addIndex('sample_type', ['lab_id', 'type'], {
        unique: true,
        name: 'unique_sample_type_per_lab'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert categories
    const catTableInfo = await queryInterface.describeTable('categories_test_and_culture');
    const catIndices = await queryInterface.showIndex('categories_test_and_culture');

    if (catIndices.some(idx => idx.name === 'unique_category_name_per_lab')) {
      await queryInterface.removeIndex('categories_test_and_culture', 'unique_category_name_per_lab');
    }
    if (!catIndices.some(idx => idx.name === 'name_UNIQUE')) {
      await queryInterface.addIndex('categories_test_and_culture', ['name'], { unique: true, name: 'name_UNIQUE' });
    }
    if (catTableInfo.lab_id) {
      await queryInterface.removeColumn('categories_test_and_culture', 'lab_id');
    }

    // Revert sample_type
    const sampleTableInfo = await queryInterface.describeTable('sample_type');
    const sampleIndices = await queryInterface.showIndex('sample_type');

    if (sampleIndices.some(idx => idx.name === 'unique_sample_type_per_lab')) {
      await queryInterface.removeIndex('sample_type', 'unique_sample_type_per_lab');
    }
    if (!sampleIndices.some(idx => idx.name === 'type_UNIQUE')) {
      await queryInterface.addIndex('sample_type', ['type'], { unique: true, name: 'type_UNIQUE' });
    }
    if (sampleTableInfo.lab_id) {
      await queryInterface.removeColumn('sample_type', 'lab_id');
    }
  }
};
