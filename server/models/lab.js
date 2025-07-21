const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    subdomain: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    region: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    governorate: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    license_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    owner: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'id'
      }
    },
    subscription_duration: {
      type: DataTypes.ENUM('free_trial', 'monthly', '3_months', '6_months', 'yearly'),
      allowNull: false,
      defaultValue: 'free_trial'
    },
    subscription_status: {
      type: DataTypes.ENUM('trial', 'active', 'suspended', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'trial'
    },
    subscription_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    subscription_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    subscription_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    logo_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    lab_name_invoice: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lab_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    lab_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lab_email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lab_website: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    primary_color: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    secondary_color: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'lab',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" }
        ]
      },
      {
        name: "idx_lab_tenant",
        using: "BTREE",
        fields: [
          { name: "tenant_id" }
        ]
      },
      {
        name: "idx_lab_subdomain",
        using: "BTREE",
        fields: [
          { name: "subdomain" }
        ]
      }
    ]
  });
};
