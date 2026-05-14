const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sample_type', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    standard_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "unique_standard_code_per_lab"
    },
    tube_color: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    container_type: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lab',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'sample_type',
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
        name: "unique_sample_type_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "type" },
        ]
      },
      {
        name: "unique_standard_code_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "lab_id" },
          { name: "standard_code" },
        ]
      },
    ]
  });
};
