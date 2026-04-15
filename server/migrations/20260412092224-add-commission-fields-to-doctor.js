'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('doctor');
      
      const addColIfNotExists = async (colName, options) => {
        if (!tableInfo[colName]) {
          await queryInterface.addColumn('doctor', colName, options, { transaction });
          console.log(`✅ Added column: ${colName}`);
        } else {
          console.log(`⚠️ Skipped addition: ${colName} already exists`);
        }
      };

      await addColIfNotExists('commission', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      await addColIfNotExists('due', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      await addColIfNotExists('collected', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      await addColIfNotExists('total_gain', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      await addColIfNotExists('patient_count', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
      await addColIfNotExists('created_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
      await addColIfNotExists('updated_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
      await addColIfNotExists('is_contracted', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const dropColIfExists = async (colName) => {
        try {
          await queryInterface.removeColumn('doctor', colName, { transaction });
          console.log(`✅ Removed column: ${colName}`);
        } catch (err) {
          console.log(`⚠️ Skipped removal: ${colName} missing or failed -> ${err.message}`);
        }
      };

      await dropColIfExists('commission');
      await dropColIfExists('due');
      await dropColIfExists('collected');
      await dropColIfExists('total_gain');
      await dropColIfExists('patient_count');
      await dropColIfExists('created_at');
      await dropColIfExists('updated_at');
      await dropColIfExists('is_contracted');

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
