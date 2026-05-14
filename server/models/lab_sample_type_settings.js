const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab_sample_type_settings', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    sample_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sample_type',
        key: 'id'
      }
    },
    tube_color: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    container_type: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'lab_sample_type_settings',
    timestamps: false,
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
        name: "unique_lab_sample_type",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "sample_type_id" },
        ]
      },
    ]
  });
};
