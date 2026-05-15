const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('packages_and_offers', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    shortcut: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('package', 'offer'),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'packages_and_offers',
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
