const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('medical_report_test_component_result', {
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
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test',
        key: 'id'
      }
    },
    test_component_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test_component',
        key: 'id'
      }
    },
    result: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending','done','low','critical low','normal','high','critical high','abnormal'),
      allowNull: true,
      defaultValue: 'pending'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'medical_report_test_component_result',
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
        name: "unique_component_result",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
          { name: "test_id" },
          { name: "test_component_id" },
        ]
      },
      {
        name: "fk_component_result_medical_report_idx",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
        ]
      },
      {
        name: "fk_component_result_test_idx",
        using: "BTREE",
        fields: [
          { name: "test_id" },
        ]
      },
      {
        name: "fk_component_result_test_component_idx",
        using: "BTREE",
        fields: [
          { name: "test_component_id" },
        ]
      },
      {
        name: "idx_medical_report_test",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
          { name: "test_id" },
        ]
      },
    ]
  });
};