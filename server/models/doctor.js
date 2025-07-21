const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('doctor', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
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
      type: DataTypes.STRING(100),
      allowNull: true
    },
    passport_no: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: "passport_no_UNIQUE"
    }
  }, {
    sequelize,
    tableName: 'doctor',
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
        name: "national_id_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "national_id" },
        ]
      },
      {
        name: "unique_national_id_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "national_id" },
        ]
      },
      {
        name: "unique_passport_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "passport_no" },
        ]
      },
      {
        name: "idx_doctor_lab",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
    ]
  });
};
