'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add lab_id to categories_test_and_culture
    try {
      await queryInterface.addColumn('categories_test_and_culture', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true, // Allow NULL for existing global categories if any
        references: {
          model: 'lab',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ Added lab_id column to categories_test_and_culture');
    } catch (error) {
      console.warn('⚠️ Warning: Failed to add lab_id to categories_test_and_culture. Reason:', error.message);
    }

    // 2. Update unique constraint to include lab_id
    try {
      // First drop the global unique index
      await queryInterface.removeIndex('categories_test_and_culture', 'name_UNIQUE');
      console.log('✅ Removed global name_UNIQUE index from categories_test_and_culture');
    } catch (error) {
      console.warn('⚠️ Warning: Failed to remove name_UNIQUE index. Reason:', error.message);
    }

    try {
      // Add new unique index scoped by lab_id
      await queryInterface.addIndex('categories_test_and_culture', ['name', 'lab_id'], {
        name: 'category_name_lab_unique',
        unique: true
      });
      console.log('✅ Added unique index category_name_lab_unique to categories_test_and_culture');
    } catch (error) {
      console.warn('⚠️ Warning: Failed to add unique index. Reason:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('categories_test_and_culture', 'category_name_lab_unique');
      await queryInterface.addIndex('categories_test_and_culture', ['name'], {
        name: 'name_UNIQUE',
        unique: true
      });
      await queryInterface.removeColumn('categories_test_and_culture', 'lab_id');
    } catch (error) {
      console.error('Error in categories_test_and_culture migration down:', error.message);
    }
  }
};
