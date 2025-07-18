const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tg_component', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    test_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test_group',
        key: 'id'
      }
    },
    test_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tgc_category',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    reference_range: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    result_type: {
      type: DataTypes.ENUM('range', 'boolean'),
      allowNull: false,
      defaultValue: 'range'
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tg_component',
    timestamps: false,
    defaultScope: {
      where: { deleted_at: null }
    },
    scopes: {
      withDeleted: {}
    }
  });
}; 