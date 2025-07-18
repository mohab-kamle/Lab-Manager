const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('medical_report_has_test', {
    medical_report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'medical_report',
        key: 'id'
      }
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'test',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending','done','low','critical low','normal','high','critical high','abnormal'),
      allowNull: true,
      defaultValue: 'pending'
    },
    result: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'medical_report_has_test',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
          { name: "test_id" },
        ]
      },
      {
        name: "fk_medical_report_has_test_test1_idx",
        using: "BTREE",
        fields: [
          { name: "test_id" },
        ]
      },
      {
        name: "fk_medical_report_has_test_medical_report1_idx",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
        ]
      },
    ]
  });
};
