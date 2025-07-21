const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('payment_method', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "name_UNIQUE"
    }
  }, {
    sequelize,
    tableName: 'payment_method',
    timestamps: false,
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
        name: "unique_payment_method_name_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "name" },
        ]
      },
      {
        name: "idx_payment_method_lab",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
