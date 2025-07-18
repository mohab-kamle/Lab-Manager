const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('medical_report_has_culture_antibiotic', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    medical_report_has_culture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'medical_report_has_culture',
        key: 'id'
      }
    },
    antibiotic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'antibiotic',
        key: 'id'
      }
    },
    sensitivity: {
      type: DataTypes.ENUM('sensitive', 'moderate', 'resistant'),
      allowNull: false,
      defaultValue: 'moderate'
    },
    zone_size: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
      comment: 'Zone of inhibition in millimeters'
    }
  }, {
    sequelize,
    tableName: 'medical_report_has_culture_antibiotic',
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
        name: "idx_culture_id",
        using: "BTREE",
        fields: [
          { name: "medical_report_has_culture_id" }
        ]
      },
      {
        name: "idx_antibiotic_id",
        using: "BTREE",
        fields: [
          { name: "antibiotic_id" }
        ]
      },
      {
        name: "unique_culture_antibiotic",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "medical_report_has_culture_id" },
          { name: "antibiotic_id" }
        ]
      },
      {
        name: "idx_zone_size",
        using: "BTREE",
        fields: [
          { name: "zone_size" }
        ]
      }
    ]
  });
}; 