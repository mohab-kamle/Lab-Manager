const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('patient', {
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
    patientcode: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "patientcode_UNIQUE"
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('Male','Female'),
      allowNull: true
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    national_id: {
      type: DataTypes.CHAR(14),
      allowNull: true,
      unique: "national_id_UNIQUE"
    },
    nationality: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    passport_no: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: "passport_no_UNIQUE"
    },
    address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    total: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    paid: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    due: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    contract_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contract',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'patient',
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
        name: "patientcode_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "patientcode" },
        ]
      },
      {
        name: "national_id_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "national_id" },
        ]
      },
      {
        name: "passport_no_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "passport_no" },
        ]
      },
      {
        name: "fk_patient_contract1_idx",
        using: "BTREE",
        fields: [
          { name: "contract_id" },
        ]
      },
    ]
  });
};
