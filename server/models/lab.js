const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    region: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    governorate: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    license_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    owner: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'lab',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" }
        ]
      }
    ]
  });
};
