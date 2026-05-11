const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('categories_test_and_culture', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "category_name_lab_unique"
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lab',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'categories_test_and_culture',
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
        name: "category_name_lab_unique",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
          { name: "lab_id" },
        ]
      },
    ]
  });
};
