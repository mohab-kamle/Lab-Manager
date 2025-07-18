const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('field_comp_options', {
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
    tg_component_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tg_component',
        key: 'id'
      }
    },
    tg_fields_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tg_fields',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'field_comp_options',
    timestamps: false,
    defaultScope: {
      where: { deleted_at: null }
    },
    scopes: {
      withDeleted: {}
    }
  });
};