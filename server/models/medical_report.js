const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const medical_report = sequelize.define('medical_report', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    registered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    collected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reported_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    prints_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    whatsapp_sends: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    done: {
      type: DataTypes.TINYINT,
      allowNull: true
    },
    signatory_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'chemist',
        key: 'id'
      }
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'patient',
        key: 'id'
      }
    },
    pending: {
      type: DataTypes.TINYINT,
      allowNull: true
    },
    comment: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    signatory_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'admin',
        key: 'id'
      }
    },
    signatory_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bill',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'medical_report',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
          { name: "patient_id" },
        ]
      },
      {
        name: "fk_medical_report_chemist1_idx",
        using: "BTREE",
        fields: [
          { name: "signatory_id" },
        ]
      },
      {
        name: "fk_medical_report_patient1_idx",
        using: "BTREE",
        fields: [
          { name: "patient_id" },
        ]
      },
      {
        name: "fk_medical_report_admin1_idx",
        using: "BTREE",
        fields: [
          { name: "signatory_admin_id" },
        ]
      },
      {
        name: "fk_medical_report_bill1_idx",
        using: "BTREE",
        fields: [
          { name: "bill_id" },
        ]
      },
    ]
  });
  return medical_report;
};
