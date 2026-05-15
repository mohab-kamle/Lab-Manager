const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('test', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "unique_test_name_per_lab"
    },
    shortcut: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "unique_test_shortcut_per_lab"
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    lab_to_lab_status: {
      type: DataTypes.ENUM('IN', 'OUT'),
      allowNull: true
    },
    lab_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories_test_and_culture',
        key: 'id'
      }
    },
    precautions: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    decreased_in: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    increased_in: {
      type: DataTypes.STRING(100),
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
    contract_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contract',
        key: 'id'
      }
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    global_test_id: {
      type: DataTypes.STRING(36),
      allowNull: true
      // FK constraint is managed via migration + init-models.js associations
    },
    structure_config: {
      type: DataTypes.JSON,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('single', 'panel', 'culture'),
      allowNull: false,
      defaultValue: 'single'
    },
    tat_hours: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'test',
    timestamps: true,
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
        name: "unique_test_name_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "name" },
          { name: "lab_id" },
        ]
      },
      {
        name: "unique_test_shortcut_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "shortcut" },
          { name: "lab_id" },
        ]
      },
      {
        name: "fk_test_categories_test_and_culture1_idx",
        using: "BTREE",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "fk_test_sample_type1_idx",
        using: "BTREE",
        fields: [
          { name: "sample_type_id" },
        ]
      },
      {
        name: "fk_test_contract1_idx",
        using: "BTREE",
        fields: [
          { name: "contract_id" },
        ]
      },
      {
        name: "fk_test_global_test_catalog_idx",
        using: "BTREE",
        fields: [
          { name: "global_test_id" },
        ]
      },
      {
        name: "fk_test_lab_idx",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
