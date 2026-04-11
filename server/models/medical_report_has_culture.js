const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  class MedicalReportHasCulture extends sequelize.Sequelize.Model {
    static associate(models) {
      // Define hasMany association with medical_report_culture_result
      MedicalReportHasCulture.hasMany(models.medical_report_culture_result, {
        as: "culture_results",
        foreignKey: "medical_report_has_culture_id",
      });
      // Define hasMany association with medical_report_has_culture_antibiotic
      MedicalReportHasCulture.hasMany(models.medical_report_has_culture_antibiotic, {
        as: "culture_antibiotics",
        foreignKey: "medical_report_has_culture_id",
      });
    }
  }
  MedicalReportHasCulture.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    medical_report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'medical_report',
        key: 'id'
      }
    },
    culture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'culture',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending','done','low','critical low','normal','high','critical high','abnormal'),
      allowNull: true,
      defaultValue: 'pending'
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'medical_report_has_culture',
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
        name: "unique_medical_report_culture",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
          { name: "culture_id" },
        ]
      },
      {
        name: "fk_medical_report_has_culture_culture1_idx",
        using: "BTREE",
        fields: [
          { name: "culture_id" },
        ]
      },
      {
        name: "fk_medical_report_has_culture_medical_report1_idx",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
        ]
      },
    ]
  });
  return MedicalReportHasCulture;
};