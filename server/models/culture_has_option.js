'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultureHasOption extends Model {
    static associate(models) {
      // Associations will be defined in the init-models.js file
    }
  }
  CultureHasOption.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    culture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'culture',
        key: 'id'
      }
    },
    culture_option_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'culture_option',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CultureHasOption',
    tableName: 'culture_has_option',
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['culture_id', 'culture_option_id']
      },
      {
        fields: ['culture_id']
      },
      {
        fields: ['culture_option_id']
      }
    ]
  });
  return CultureHasOption;
};
