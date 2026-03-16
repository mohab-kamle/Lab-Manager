const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('inventory_batch', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'inventory_item',
        key: 'id'
      }
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'supplier',
        key: 'id'
      }
    },
    batch_number: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    initial_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    current_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    received_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    expiration_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    cost_per_unit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
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
    tableName: 'inventory_batch',
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
        name: "fk_inventory_batch_item_id",
        using: "BTREE",
        fields: [
          { name: "item_id" },
        ]
      },
      {
        name: "fk_inventory_batch_supplier_id",
        using: "BTREE",
        fields: [
          { name: "supplier_id" },
        ]
      },
      {
        name: "fk_inventory_batch_lab_id",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
