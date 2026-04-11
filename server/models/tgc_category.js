const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tgc_category', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    test_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test_group',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'tgc_category',
    timestamps: false,
    defaultScope: {
      where: { deleted_at: null }
    },
    scopes: {
      withDeleted: {}
    }
  });
};