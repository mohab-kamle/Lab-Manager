'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.createTable('lab_whatsapp_accounts', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
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
        },
        provider: {
          type: Sequelize.ENUM('web', 'meta'),
          defaultValue: 'web',
          allowNull: false
        },
        phone_number: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('connected', 'disconnected'),
          defaultValue: 'disconnected',
          allowNull: false
        },
        session_path: {
          type: Sequelize.STRING,
          allowNull: true
        },
        meta_phone_number_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        meta_access_token: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
      console.log('✅ Created table: lab_whatsapp_accounts');
    } catch (e) {
      console.log('⚠️ table lab_whatsapp_accounts already exists');
    }

    try {
      await queryInterface.createTable('whatsapp_messages', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
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
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'patient',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        phone_number: {
          type: Sequelize.STRING,
          allowNull: false
        },
        message_type: {
          type: Sequelize.ENUM('text', 'document'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'sent', 'failed'),
          allowNull: false,
          defaultValue: 'pending'
        },
        error: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
      console.log('✅ Created table: whatsapp_messages');
    } catch (e) {
      console.log('⚠️ table whatsapp_messages already exists');
    }
  },


  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('whatsapp_messages');
    await queryInterface.dropTable('lab_whatsapp_accounts');
  }
};
