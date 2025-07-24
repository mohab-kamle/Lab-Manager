const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab_settings', {
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
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    setting_type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      allowNull: false,
      defaultValue: 'string'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'lab_settings',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" }
        ]
      },
      {
        name: "unique_lab_setting",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "setting_key" }
        ]
      },
      {
        name: "idx_lab_settings_lab",
        using: "BTREE",
        fields: [
          { name: "lab_id" }
        ]
      }
    ]
  });
}; 