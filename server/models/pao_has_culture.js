const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pao_has_culture', {
    packages_and_offers_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'packages_and_offers',
        key: 'id'
      }
    },
    culture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'culture',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'pao_has_culture',
    timestamps: false,
    indexes: [
      {
        name: "idx_culture_id",
        using: "BTREE",
        fields: [
          { name: "culture_id" },
        ]
      },
      {
        name: "idx_pao_id",
        using: "BTREE",
        fields: [
          { name: "packages_and_offers_id" },
        ]
      },
    ]
  });
};
