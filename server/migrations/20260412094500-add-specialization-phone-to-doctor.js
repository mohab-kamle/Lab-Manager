'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('doctor');
      
      if (!tableInfo['specialization']) {
        await queryInterface.addColumn('doctor', 'specialization', {
          type: Sequelize.STRING(100),
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo['phone']) {
        await queryInterface.addColumn('doctor', 'phone', {
          type: Sequelize.STRING(20),
          allowNull: true
        }, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('doctor', 'specialization', { transaction });
      await queryInterface.removeColumn('doctor', 'phone', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
