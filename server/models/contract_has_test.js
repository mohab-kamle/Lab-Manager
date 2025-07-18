const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('contract_has_test', {
    contract_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contract',
        key: 'id'
      }
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'test',
        key: 'id'
      }
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    custom_price: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'contract_has_test',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "contract_id" },
          { name: "test_id" },
        ]
      },
      {
        name: "fk_contract_has_test_test1_idx",
        using: "BTREE",
        fields: [
          { name: "test_id" },
        ]
      },
      {
        name: "fk_contract_has_test_contract1_idx",
        using: "BTREE",
        fields: [
          { name: "contract_id" },
        ]
      },
    ]
  });
};
