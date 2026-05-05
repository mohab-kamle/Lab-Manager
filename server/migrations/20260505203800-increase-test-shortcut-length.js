'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('test');
    
    // Check if the column exists and if its length is less than 255
    // In MySQL/MariaDB, the type will be something like 'VARCHAR(45)'
    if (tableInfo.shortcut) {
      const currentType = tableInfo.shortcut.type.toUpperCase();
      if (currentType.includes('VARCHAR') && !currentType.includes('255')) {
        await queryInterface.changeColumn('test', 'shortcut', {
          type: Sequelize.STRING(255),
          allowNull: true,
          // Re-specify unique to ensure it's preserved
          unique: "shortcut_UNIQUE"
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('test', 'shortcut', {
      type: Sequelize.STRING(45),
      allowNull: true,
      unique: "shortcut_UNIQUE"
    });
  }
};
