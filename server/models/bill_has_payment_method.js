const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bill_has_payment_method', {
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'bill',
        key: 'id'
      }
    },
    payment_method_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'payment_method',
        key: 'id'
      }
    },
    paid_amount: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'bill_has_payment_method',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "bill_id" },
          { name: "payment_method_id" },
        ]
      },
      {
        name: "fk_bill_has_payment_method_payment_method1_idx",
        using: "BTREE",
        fields: [
          { name: "payment_method_id" },
        ]
      },
      {
        name: "fk_bill_has_payment_method_bill1_idx",
        using: "BTREE",
        fields: [
          { name: "bill_id" },
        ]
      },
    ]
  });
};
