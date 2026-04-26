const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('phone_number', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
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
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'doctor',
        key: 'id'
      }
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'supplier',
        key: 'id'
      }
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    type: {
      type: DataTypes.ENUM('personal', 'home', 'work'),
      allowNull: false,
      defaultValue: 'personal'
    }
  }, {
    sequelize,
    tableName: 'phone_numbers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
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
        name: "idx_phone",
        using: "BTREE",
        fields: [
          { name: "phone" },
        ]
      },
      {
        name: "unique_patient_phone",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "patient_id" },
          { name: "phone" },
        ]
      },
      {
        name: "unique_employee_phone",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "employee_id" },
          { name: "phone" },
        ]
      },
      {
        name: "unique_doctor_phone",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "doctor_id" },
          { name: "phone" },
        ]
      },
      {
        name: "unique_supplier_phone",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "supplier_id" },
          { name: "phone" },
        ]
      },
      {
        name: "unique_lab_phone",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "phone" },
        ]
      },
    ]
  });
};
