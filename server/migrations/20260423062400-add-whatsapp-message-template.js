'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add message_template column to lab_whatsapp_accounts (idempotent)
    const tableDescription = await queryInterface.describeTable('lab_whatsapp_accounts');
    if (!tableDescription.message_template) {
      await queryInterface.addColumn('lab_whatsapp_accounts', 'message_template', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: 'Hello! Here is your lab report from {{lab_name}}. If you have any questions, please contact us.'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('lab_whatsapp_accounts');
    if (tableDescription.message_template) {
      await queryInterface.removeColumn('lab_whatsapp_accounts', 'message_template');
    }
  }
};
