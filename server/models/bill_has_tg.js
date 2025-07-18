const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bill_has_tg', {
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'bill',
        key: 'id'
      }
    },
    tg_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'test_group',
        key: 'id'
      }
    },
    price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    sequelize,
    tableName: 'bill_has_tg',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "bill_id" },
          { name: "tg_id" },
        ]
      },
      {
        name: "fk_bill_has_tg_tg1_idx",
        using: "BTREE",
        fields: [
          { name: "tg_id" },
        ]
      },
      {
        name: "fk_bill_has_tg_bill1_idx",
        using: "BTREE",
        fields: [
          { name: "bill_id" },
        ]
      },
    ]
  });
};
