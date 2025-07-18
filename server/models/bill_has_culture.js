const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bill_has_culture', {
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'bill',
        key: 'id'
      }
    },
    culture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'culture',
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
    tableName: 'bill_has_culture',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "bill_id" },
          { name: "culture_id" },
        ]
      },
      {
        name: "fk_bill_has_culture_culture1_idx",
        using: "BTREE",
        fields: [
          { name: "culture_id" },
        ]
      },
      {
        name: "fk_bill_has_culture_bill1_idx",
        using: "BTREE",
        fields: [
          { name: "bill_id" },
        ]
      },
    ]
  });
};
