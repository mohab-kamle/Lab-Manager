const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('comment_images', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    comment_type: {
      type: DataTypes.ENUM('test', 'test_group', 'medical_report'),
      allowNull: false
    },
    comment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'References test_comments.id, test_group_comments.id, or medical_report.id'
    },
    image_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    image_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    image_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    upload_order: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 3
      }
    }
  }, {
    sequelize,
    tableName: 'comment_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
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
        name: "idx_comment_images_type_id",
        using: "BTREE",
        fields: [
          { name: "comment_type" },
          { name: "comment_id" }
        ]
      },
      {
        name: "idx_comment_images_upload_order",
        using: "BTREE",
        fields: [
          { name: "upload_order" }
        ]
      },
      {
        name: "idx_comment_images_type_id_order",
        using: "BTREE",
        fields: [
          { name: "comment_type" },
          { name: "comment_id" },
          { name: "upload_order" }
        ]
      }
    ]
  });
};