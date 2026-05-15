const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('otp_verification', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      indexes: [
        {
          name: "otp_email_idx",
          fields: ["email"]
        }
      ]
    },
    otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'otp_verifications',
    timestamps: true,
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
        name: "otp_email_idx",
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      }
    ]
  });
};
