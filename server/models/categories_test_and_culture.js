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
      allowNull: false
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
        name: "unique_category_name_per_lab",
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
