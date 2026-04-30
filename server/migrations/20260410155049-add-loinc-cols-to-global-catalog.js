'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
// Helper function to safely add columns without crashing the migration
    const addColumnSafely = async (columnName, attributes) => {
      try {
        await queryInterface.addColumn('global_test_catalog', columnName, attributes);
        console.log(`✅ Success: Added '${columnName}' column.`);
      } catch (error) {
        if (error.message.includes("Duplicate column name")) {
          console.log(`⚠️ Warning: Skipped adding '${columnName}'. Column already exists.`);
        } else {
          throw error; // Throw actual database errors
        }
      }
    };

    // Execute sequentially so one failure doesn't stop the others
    await addColumnSafely('type', {
      type: Sequelize.ENUM('single', 'panel', 'culture'),
      allowNull: false,
      defaultValue: 'single'
    });

    await addColumnSafely('order_rank', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnSafely('patient_friendly_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnSafely('global_category', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
// Helper function to safely remove columns
    const removeColumnSafely = async (columnName) => {
      try {
        await queryInterface.removeColumn('global_test_catalog', columnName);
        console.log(`✅ Success: Removed '${columnName}' column.`);
      } catch (error) {
        console.log(`⚠️ Warning: Skipped removing '${columnName}'. It might not exist.`);
      }
    };

    await removeColumnSafely('type');
    await removeColumnSafely('order_rank');
    await removeColumnSafely('patient_friendly_name');
    await removeColumnSafely('global_category');
  }
};
