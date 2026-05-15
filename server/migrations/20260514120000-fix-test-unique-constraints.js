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

      // 2. Handle existing NULL lab_id before enforcing NOT NULL
      // Find a fallback lab or create one if none exists
      const [labs] = await queryInterface.sequelize.query('SELECT id FROM lab LIMIT 1', { transaction });
      let fallbackLabId;
      
      if (labs.length > 0) {
        fallbackLabId = labs[0].id;
      } else {
        // Create a default system lab if none exists
        await queryInterface.sequelize.query(
          "INSERT INTO lab (name, slug, status, created_at, updated_at) VALUES ('System Default Lab', 'system-default', 'active', NOW(), NOW())",
          { transaction }
        );
        const [newLabs] = await queryInterface.sequelize.query("SELECT id FROM lab WHERE slug = 'system-default' LIMIT 1", { transaction });
        fallbackLabId = newLabs[0].id;
      }

      // Update records with NULL lab_id
      await queryInterface.sequelize.query(
        `UPDATE test SET lab_id = ${fallbackLabId} WHERE lab_id IS NULL`,
        { transaction }
      );

      // 3. Ensure lab_id is NOT NULL
      await queryInterface.changeColumn('test', 'lab_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab',
          key: 'id'
        }
      }, { transaction });

      // 4. Add new composite unique indexes scoped per lab
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
      const tableIndices = await queryInterface.showIndex('test');

      if (tableIndices.some(idx => idx.name === 'unique_test_name_per_lab')) {
        await queryInterface.removeIndex('test', 'unique_test_name_per_lab', { transaction });
      }
      if (tableIndices.some(idx => idx.name === 'unique_test_shortcut_per_lab')) {
        await queryInterface.removeIndex('test', 'unique_test_shortcut_per_lab', { transaction });
      }

      if (!tableIndices.some(idx => idx.name === 'name_UNIQUE')) {
        await queryInterface.addIndex('test', ['name'], {
          name: 'name_UNIQUE',
          unique: true,
          transaction
        });
      }

      if (!tableIndices.some(idx => idx.name === 'shortcut_UNIQUE')) {
        await queryInterface.addIndex('test', ['shortcut'], {
          name: 'shortcut_UNIQUE',
          unique: true,
          transaction
        });
      }

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
