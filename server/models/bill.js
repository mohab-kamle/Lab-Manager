const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bill', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paid: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    due: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    subtotal: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    total: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    discount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    tax: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    receptionist_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'receptionist',
        key: 'id'
      }
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'patient',
        key: 'id'
      }
    },
    status_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'status',
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branch',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'bill',
    timestamps: false,
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
        name: "fk_bill_receptionist1_idx",
        using: "BTREE",
        fields: [
          { name: "receptionist_id" },
        ]
      },
      {
        name: "fk_bill_patient1_idx",
        using: "BTREE",
        fields: [
          { name: "patient_id" },
        ]
      },
      {
        name: "fk_bill_status1_idx",
        using: "BTREE",
        fields: [
          { name: "status_id" },
        ]
      },
      {
        name: "idx_bill_lab",
        using: "BTREE",
        fields: [
          { name: "lab_id" }
        ]
      },
      {
        name: "idx_bill_branch",
        using: "BTREE",
        fields: [
          { name: "branch_id" }
        ]
      }
    ]
  });
};
