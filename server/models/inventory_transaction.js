const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('inventory_transaction', {
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
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'inventory_batch',
        key: 'id'
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('RECEIVE', 'CONSUME', 'EXPIRE', 'ADJUST', 'RETURN'),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Positive for RECEIVE, negative for CONSUME/EXPIRE"
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'id'
      }
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
    tableName: 'inventory_transaction',
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
        name: "fk_inventory_tx_item_id",
        using: "BTREE",
        fields: [
          { name: "item_id" },
        ]
      },
      {
        name: "fk_inventory_tx_batch_id",
        using: "BTREE",
        fields: [
          { name: "batch_id" },
        ]
      },
      {
        name: "fk_inventory_tx_employee_id",
        using: "BTREE",
        fields: [
          { name: "employee_id" },
        ]
      },
      {
        name: "fk_inventory_tx_lab_id",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
