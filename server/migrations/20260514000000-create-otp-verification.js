'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables();
      
      if (!tables.includes('otp_verifications')) {
        await queryInterface.createTable('otp_verifications', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: false
          },
          otp_hash: {
            type: Sequelize.STRING(255),
            allowNull: false
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: false
          },
          attempts: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          verified: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
          }
        }, { transaction });
      }

      try {
        await queryInterface.addIndex('otp_verifications', ['email'], {
          name: 'otp_email_idx',
          transaction
        });
      } catch (e) {
        console.log('⚠️ Index otp_email_idx already exists or could not be created');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.dropTable('otp_verifications');
    } catch (e) {
      console.log('⚠️ Table otp_verifications already dropped or does not exist');
    }
  }
};
