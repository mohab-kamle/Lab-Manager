const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pao_has_test', {
    packages_and_offers_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'packages_and_offers',
        key: 'id'
      }
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'test',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'pao_has_test',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "packages_and_offers_id" },
          { name: "test_id" },
        ]
      },
      {
        name: "fk_pao_has_test_test1_idx",
        using: "BTREE",
        fields: [
          { name: "test_id" },
        ]
      },
      {
        name: "fk_pao_has_test_packages_and_offers1_idx",
        using: "BTREE",
        fields: [
          { name: "packages_and_offers_id" },
        ]
      },
    ]
  });
};
