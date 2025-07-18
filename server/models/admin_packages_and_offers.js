const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "admin_packages_and_offers",
    {
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "admin",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      package_and_offer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "packages_and_offers",
          key: "id",
        },
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      tableName: "admin_packages_and_offers",
      timestamps: false,
      indexes: [
        {
          name: "pk_admin_package_and_offer",
          unique: true,
          using: "BTREE",
          fields: ["admin_id", "package_and_offer_id"],
        },
        {
          name: "idx_package_and_offer_id",
          using: "BTREE",
          fields: ["package_and_offer_id"],
        },
        {
          name: "idx_admin_id",
          using: "BTREE",
          fields: ["admin_id"],
        },
      ],
    }
  );
}; 