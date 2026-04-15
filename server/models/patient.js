const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'patient',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      lab_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'lab',
          key: 'id',
        },
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'branch',
          key: 'id',
        },
      },
      name: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      patientcode: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM('Male', 'Female'),
        allowNull: true,
      },
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      national_id: {
        type: DataTypes.CHAR(14),
        allowNull: true,
      },
      nationality: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      passport_no: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      due: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      contract_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'contract',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      tableName: 'patient',
      timestamps: true,
      indexes: [
        // Primary key
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        // Foreign-key indexes
        {
          name: 'fk_patient_lab_idx',
          using: 'BTREE',
          fields: [{ name: 'lab_id' }],
        },
        {
          name: 'fk_patient_branch_idx',
          using: 'BTREE',
          fields: [{ name: 'branch_id' }],
        },
        {
          name: 'fk_patient_contract1_idx',
          using: 'BTREE',
          fields: [{ name: 'contract_id' }],
        },
        // Unique constraints scoped per lab
        {
          name: 'unique_patient_code_per_lab',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'lab_id' }, { name: 'patientcode' }],
        },
        {
          name: 'unique_national_id_per_lab',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'lab_id' }, { name: 'national_id' }],
        },
        {
          name: 'unique_passport_per_lab',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'lab_id' }, { name: 'passport_no' }],
        },
        // Convenience index for lab lookup
        {
          name: 'idx_patient_lab',
          using: 'BTREE',
          fields: [{ name: 'lab_id' }],
        },
      ],
    }
  );
};
