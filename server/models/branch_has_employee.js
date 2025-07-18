const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('branch_has_employee', {
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'branch',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'employee',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'branch_has_employee',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "branch_id" },
          { name: "employee_id" }
        ]
      },
      {
        name: "fk_branch_has_employee_employee1_idx",
        using: "BTREE",
        fields: [
          { name: "employee_id" }
        ]
      },
      {
        name: "fk_branch_has_employee_branch1_idx",
        using: "BTREE",
        fields: [
          { name: "branch_id" }
        ]
      }
    ]
  });
};
