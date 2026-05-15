const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bill_has_package', {
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'bill',
        key: 'id'
      }
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'packages_and_offers',
        key: 'id'
      }
    },
    price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_refunded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'bill_has_package',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "bill_id" },
          { name: "package_id" },
        ]
      },
      {
        name: "fk_bill_has_package_package_idx",
        using: "BTREE",
        fields: [
          { name: "package_id" },
        ]
      },
      {
        name: "fk_bill_has_package_bill_idx",
        using: "BTREE",
        fields: [
          { name: "bill_id" },
        ]
      },
    ]
  });
}; 