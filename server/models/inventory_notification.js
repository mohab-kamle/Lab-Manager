const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('inventory_notification', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'inventory_item',
        key: 'id'
      }
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'inventory_batch',
        key: 'id'
      }
    },
    alert_type: {
      type: DataTypes.ENUM('LOW_STOCK', 'EXPIRING_SOON', 'EXPIRED'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('UNREAD', 'READ', 'DISMISSED'),
      allowNull: false,
      defaultValue: 'UNREAD'
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'inventory_notification',
    timestamps: true,
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
        name: "fk_inventory_notification_item_id",
        using: "BTREE",
        fields: [
          { name: "item_id" },
        ]
      },
      {
        name: "fk_inventory_notification_batch_id",
        using: "BTREE",
        fields: [
          { name: "batch_id" },
        ]
      },
      {
        name: "fk_inventory_notification_lab_id",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
