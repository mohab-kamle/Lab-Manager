const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('antibiotic', {
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
    shortcut: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: "shortcut_UNIQUE"
    },
    commercial_name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: "commercial_name_UNIQUE"
    }
  }, {
    sequelize,
    tableName: 'antibiotic',
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
        name: "shortcut_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "shortcut" },
        ]
      },
      {
        name: "commercial_name_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "commercial_name" },
        ]
      },
    ]
  });
};
