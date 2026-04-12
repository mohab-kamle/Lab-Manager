'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    await queryInterface.dropTable('tg_component').catch(() => { });
    await queryInterface.dropTable('tgc_category').catch(() => { });
    await queryInterface.dropTable('test_group').catch(() => { });

    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
