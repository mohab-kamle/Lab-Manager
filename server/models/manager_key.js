module.exports = function(sequelize, DataTypes) {
  return sequelize.define('manager_key', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    key_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    first_four: {
      type: DataTypes.STRING(4),
      allowNull: false,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employee', // Assuming your admins are in the employee table
        key: 'id'
      }
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  }, {
    sequelize,
    tableName: 'manager_key',
    timestamps: true,
  });
};