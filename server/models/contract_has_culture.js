const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('contract_has_culture', {
    contract_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contract',
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
    tableName: 'contract_has_culture',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "contract_id" },
          { name: "culture_id" },
        ]
      },
      {
        name: "fk_contract_has_culture_culture1_idx",
        using: "BTREE",
        fields: [
          { name: "culture_id" },
        ]
      },
      {
        name: "fk_contract_has_culture_contract1_idx",
        using: "BTREE",
        fields: [
          { name: "contract_id" },
        ]
      },
    ]
  });
};
