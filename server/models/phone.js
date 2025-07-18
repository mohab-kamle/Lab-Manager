const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('phone', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    phone_number: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('primary','secondary'),
      allowNull: false
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'patient',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'phone',
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
        name: "patient_id, type",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "patient_id" },
          { name: "type" },
        ]
      },
      {
        name: "employee_id, type",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "employee_id" },
          { name: "type" },
        ]
      },
      {
        name: "fk_phone_employee1_idx",
        using: "BTREE",
        fields: [
          { name: "employee_id" },
        ]
      },
    ]
  });
};
