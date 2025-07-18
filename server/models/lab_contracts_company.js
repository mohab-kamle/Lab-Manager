const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab_contracts_company', {
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'company',
        key: 'id'
      }
    },
    contract_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contract',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'lab_contracts_company',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "company_id" },
          { name: "contract_id" },
        ]
      },
      {
        name: "fk_lab_has_company_company1_idx",
        using: "BTREE",
        fields: [
          { name: "company_id" },
        ]
      },
      {
        name: "fk_lab_has_company_lab1_idx",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
      {
        name: "fk_lab_contracts_company_contract1_idx",
        using: "BTREE",
        fields: [
          { name: "contract_id" },
        ]
      },
    ]
  });
};
