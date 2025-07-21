const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('branch', {
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
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    landline: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    branch_number: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'admin',
        key: 'id'
      }
    },
    is_main_branch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'branch',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" }
        ]
      },
      {
        name: "fk_branch_lab_idx",
        using: "BTREE",
        fields: [
          { name: "lab_id" }
        ]
      },
      {
        name: "fk_branch_manager_idx",
        using: "BTREE",
        fields: [
          { name: "manager_id" }
        ]
      },
      {
        name: "idx_branch_main",
        using: "BTREE",
        fields: [
          { name: "is_main_branch" }
        ]
      }
    ]
  });
};
