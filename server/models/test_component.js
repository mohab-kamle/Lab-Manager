const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('test_component', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
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
    name: {
      type: DataTypes.STRING(35),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING(35),
      allowNull: false
    },
    normal_from: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    normal_to: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    c_low: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    c_high: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('Male','Female'),
      allowNull: true
    },
    age_start: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    age_end: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reference_range: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    result_type: {
      type: DataTypes.ENUM('range', 'boolean'),
      allowNull: false,
      defaultValue: 'range'
    }
  }, {
    sequelize,
    tableName: 'test_component',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
          { name: "test_id" },
        ]
      },
      {
        name: "fk_test_component_test1_idx",
        using: "BTREE",
        fields: [
          { name: "test_id" },
        ]
      },
    ]
  });
};
