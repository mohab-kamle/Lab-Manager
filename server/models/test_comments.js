const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('test_comments', {
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
    comment: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'test_comments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
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
        name: "fk_test_comments_medical_report_idx",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" }
        ]
      },
      {
        name: "fk_test_comments_test_idx",
        using: "BTREE",
        fields: [
          { name: "test_id" }
        ]
      },
      {
        name: "idx_test_comments_medical_report_test",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
          { name: "test_id" }
        ]
      }
    ]
  });
};