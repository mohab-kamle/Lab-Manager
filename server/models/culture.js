const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('culture', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: "name_UNIQUE"
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    sample_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sample_type',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories_test_and_culture',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'culture',
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
        name: "name_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "fk_culture_sample_types1_idx",
        using: "BTREE",
        fields: [
          { name: "sample_type_id" },
        ]
      },
      {
        name: "fk_culture_categories_test_and_culture1_idx",
        using: "BTREE",
        fields: [
          { name: "category_id" },
        ]
      },
    ]
  });
};
