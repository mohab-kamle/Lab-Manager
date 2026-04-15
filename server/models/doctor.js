const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('doctor', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: "username_UNIQUE"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
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
      type: DataTypes.ENUM('Male', 'Female'),
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
    },
    specialization: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    is_contracted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    commission: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    due: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    collected: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    total_gain: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    patient_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
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
    tableName: 'doctor',
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
        name: "username_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
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
      }
    ]
  });
};
