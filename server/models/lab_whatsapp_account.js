const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab_whatsapp_account', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    provider: {
      type: DataTypes.ENUM('web','meta'),
      allowNull: false,
      defaultValue: "web"
    },
    phone_number: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('connected','disconnected'),
      allowNull: false,
      defaultValue: "disconnected"
    },
    session_path: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meta_phone_number_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meta_access_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message_template: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Hello! Here is your lab report from {{lab_name}}. If you have any questions, please contact us.'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'lab_whatsapp_accounts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    scopes: {
      active: {
        where: { is_active: true }
      },
      ordered: {
        order: [
          ['priority', 'DESC'],
          ['last_used_at', 'DESC'],
          ['updated_at', 'DESC']
        ]
      }
    },
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "unique_lab_provider",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "provider" },
        ]
      },
      {
        name: "lab_id",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
