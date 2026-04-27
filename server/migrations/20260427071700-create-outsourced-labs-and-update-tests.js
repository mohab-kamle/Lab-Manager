'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create outsourced_lab table if it doesn't exist
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('outsourced_lab');

    if (!tableExists) {
      await queryInterface.createTable('outsourced_lab', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        contact_number: {
          type: Sequelize.STRING(45),
          allowNull: true
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        address: {
          type: Sequelize.STRING(255),
          allowNull: true
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
        }
      });
    }

    // 2. Add unique index if it doesn't exist
    // Note: If table was just created, we still check to be safe
    try {
      const indexes = await queryInterface.showIndex('outsourced_lab');
      const indexExists = indexes.some(idx => idx.name === 'unique_outsourced_lab_name_per_lab');
      if (!indexExists) {
        await queryInterface.addIndex('outsourced_lab', ['name', 'lab_id'], {
          unique: true,
          name: 'unique_outsourced_lab_name_per_lab'
        });
      }
    } catch (error) {
      // If table doesn't exist showIndex might throw, but we checked tableExists above.
      // If it's just the index missing, we add it.
      if (!error.message.includes('does not exist')) {
        await queryInterface.addIndex('outsourced_lab', ['name', 'lab_id'], {
          unique: true,
          name: 'unique_outsourced_lab_name_per_lab'
        });
      }
    }

    // 3. Rename test.outsourced_lab_name to test.lab_name
    const testTableInfo = await queryInterface.describeTable('test');
    if (testTableInfo.outsourced_lab_name && !testTableInfo.lab_name) {
      await queryInterface.renameColumn('test', 'outsourced_lab_name', 'lab_name');
    } else if (!testTableInfo.lab_name && !testTableInfo.outsourced_lab_name) {
      // If neither exists, add lab_name
      await queryInterface.addColumn('test', 'lab_name', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. Revert rename test.lab_name to test.outsourced_lab_name
    try {
      const testTableInfo = await queryInterface.describeTable('test');
      if (testTableInfo.lab_name && !testTableInfo.outsourced_lab_name) {
        await queryInterface.renameColumn('test', 'lab_name', 'outsourced_lab_name');
      }
    } catch (e) {}

    // 2. Drop outsourced_lab table
    await queryInterface.dropTable('outsourced_lab');
  }
};
