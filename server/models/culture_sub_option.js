'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultureSubOption extends Model {
    static associate(models) {
      // Associations will be defined in the init-models.js file
    }
  }
  CultureSubOption.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    culture_option_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'culture_option',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CultureSubOption',
    tableName: 'culture_sub_option',
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['culture_option_id']
      }
    ]
  });
  return CultureSubOption;
};
