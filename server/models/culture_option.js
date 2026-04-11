const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('culture_option', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    option: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "option_UNIQUE"
    }
  }, {
    sequelize,
    tableName: 'culture_option',
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
        name: "option_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "option" },
        ]
      },
    ]
  });
};
