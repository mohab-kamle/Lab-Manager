const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('test_group_comments', {
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
    test_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test_group',
        key: 'id'
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'test_group_comments',
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
        name: "fk_test_group_comments_medical_report_idx",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" }
        ]
      },
      {
        name: "fk_test_group_comments_test_group_idx",
        using: "BTREE",
        fields: [
          { name: "test_group_id" }
        ]
      },
      {
        name: "idx_test_group_comments_medical_report_group",
        using: "BTREE",
        fields: [
          { name: "medical_report_id" },
          { name: "test_group_id" }
        ]
      }
    ]
  });
};