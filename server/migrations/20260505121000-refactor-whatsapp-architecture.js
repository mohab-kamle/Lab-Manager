'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add new columns
      await queryInterface.addColumn('lab_whatsapp_accounts', 'is_active', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('lab_whatsapp_accounts', 'priority', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('lab_whatsapp_accounts', 'last_used_at', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      // 2. Data Cleanup: Remove duplicates of (lab_id, provider)
      // Keep most recently updated row per (lab_id, provider)
      await queryInterface.sequelize.query(`
        DELETE FROM lab_whatsapp_accounts 
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT MAX(id) as id
            FROM lab_whatsapp_accounts
            GROUP BY lab_id, provider
          ) as tmp
        )
      `, { transaction });

      // 3. Set one account per lab as active
      // Prefer Meta, then latest updated
      await queryInterface.sequelize.query(`
        UPDATE lab_whatsapp_accounts
        SET is_active = true
        WHERE id IN (
          SELECT id FROM (
            SELECT id
            FROM lab_whatsapp_accounts t1
            WHERE id = (
              SELECT id 
              FROM lab_whatsapp_accounts t2 
              WHERE t2.lab_id = t1.lab_id
              ORDER BY (provider = 'meta') DESC, updated_at DESC, id DESC
              LIMIT 1
            )
          ) as tmp
        )
      `, { transaction });

      // 4. Add composite unique constraint
      await queryInterface.addIndex('lab_whatsapp_accounts', ['lab_id', 'provider'], {
        unique: true,
        name: 'unique_lab_provider',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('lab_whatsapp_accounts', 'unique_lab_provider', { transaction });
      await queryInterface.removeColumn('lab_whatsapp_accounts', 'last_used_at', { transaction });
      await queryInterface.removeColumn('lab_whatsapp_accounts', 'priority', { transaction });
      await queryInterface.removeColumn('lab_whatsapp_accounts', 'is_active', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
