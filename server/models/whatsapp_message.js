const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('whatsapp_message', {
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
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'patient',
        key: 'id'
      }
    },
    phone_number: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message_type: {
      type: DataTypes.ENUM('text','document'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending','sent','failed'),
      allowNull: false,
      defaultValue: "pending"
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'whatsapp_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
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
        name: "lab_id",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
      {
        name: "patient_id",
        using: "BTREE",
        fields: [
          { name: "patient_id" },
        ]
      },
    ]
  });
};
