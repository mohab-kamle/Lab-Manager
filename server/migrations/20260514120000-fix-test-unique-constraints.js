'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Drop old global unique indexes
      const tableIndices = await queryInterface.showIndex('test');
      
      const hasNameUnique = tableIndices.some(idx => idx.name === 'name_UNIQUE');
      if (hasNameUnique) {
        await queryInterface.removeIndex('test', 'name_UNIQUE', { transaction });
      }

      const hasShortcutUnique = tableIndices.some(idx => idx.name === 'shortcut_UNIQUE');
      if (hasShortcutUnique) {
        await queryInterface.removeIndex('test', 'shortcut_UNIQUE', { transaction });
      }

      // 2. Ensure lab_id is NOT NULL
      // Note: This might fail if there are existing records with NULL lab_id.
      // In a production environment, you would need to assign these to a default lab first.
      await queryInterface.changeColumn('test', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab',
          key: 'id'
        }
      }, { transaction });

      // 3. Add new composite unique indexes scoped per lab
      await queryInterface.addIndex('test', ['lab_id', 'name'], {
        name: 'unique_test_name_per_lab',
        unique: true,
        transaction
      });

      await queryInterface.addIndex('test', ['lab_id', 'shortcut'], {
        name: 'unique_test_shortcut_per_lab',
        unique: true,
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('test', 'unique_test_name_per_lab', { transaction });
      await queryInterface.removeIndex('test', 'unique_test_shortcut_per_lab', { transaction });

      await queryInterface.addIndex('test', ['name'], {
        name: 'name_UNIQUE',
        unique: true,
        transaction
      });

      await queryInterface.addIndex('test', ['shortcut'], {
        name: 'shortcut_UNIQUE',
        unique: true,
        transaction
      });

      await queryInterface.changeColumn('test', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lab',
          key: 'id'
        }
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
