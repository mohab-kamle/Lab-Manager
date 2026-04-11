'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MedicalReportCultureResult extends Model {
    static associate(models) {
      MedicalReportCultureResult.belongsTo(models.medical_report_has_culture, {
        foreignKey: "medical_report_has_culture_id",
      });
    }
  }
  MedicalReportCultureResult.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    medical_report_has_culture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'medical_report_has_culture',
        key: 'id'
      }
    },
    culture_option_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Static copy of culture option name at time of result entry'
    },
    culture_sub_option_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Static copy of culture sub-option name at time of result entry'
    },
    custom_result: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Custom text result when no predefined options are suitable'
    },
    result_type: {
      type: DataTypes.ENUM('option', 'sub_option', 'custom'),
      allowNull: false,
      defaultValue: 'custom',
      comment: 'Type of result: option (main option only), sub_option (option + sub-option), custom (free text)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'MedicalReportCultureResult',
    tableName: 'medical_report_culture_result',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['medical_report_has_culture_id']
      },
      {
        fields: ['result_type']
      }
    ]
  });
  return MedicalReportCultureResult;
};