const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('medical_report_has_tg', {
    medical_report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'medical_report',
        key: 'id'
      },
      primaryKey: true
    },
    test_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test_group',
        key: 'id'
      },
      primaryKey: true
    },
    value: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'medical_report_has_tg',
    timestamps: false
  });
}; 