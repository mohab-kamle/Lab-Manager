const crypto = require('crypto');

// Utility function to generate the unique code
const generateTxnCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generates 6 random hex characters
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  return `TXN-${year}${month}${day}-${randomHex}`;
};


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('financial_transaction', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    transaction_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "transaction_code_UNIQUE"
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    process_type: {
      type: DataTypes.ENUM('Payment', 'Refund', 'Due', 'Credit'),
      allowNull: false
    },
    processed_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'id'
      }
    },
    processed_by_type: {
      type: DataTypes.ENUM('admin', 'receptionist', 'system'),
      allowNull: false,
      comment: 'Polymorphic relation to track who performed the action'
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'patient',
        key: 'id'
      }
    },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bill',
        key: 'id'
      }
    },
    payment_method_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'payment_method',
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
    },
    manager_key_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Only required for older refunds
      references: {
        model: 'manager_key',
        key: 'id'
      }
    },
    from: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Source of the transaction'
    },
    to: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Destination of the transaction'
    },
    integrity_hash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    refunded_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    refund_items: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Details of refunded tests/packages: [{ id, type, price }, ...]'
    }
  }, {
    sequelize,
    tableName: 'financial_transaction',
    timestamps: true, // I kept this true as an audit ledger needs createdAt/updatedAt
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
        name: "transaction_code_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "transaction_code" },
        ]
      },
      // Optional: Add indexes for foreign keys to speed up the Admin Vault queries
      {
        name: "fk_financial_transaction_patient_idx",
        using: "BTREE",
        fields: [
          { name: "patient_id" },
        ]
      },
      {
        name: "fk_financial_transaction_lab_idx",
        using: "BTREE",
        fields: [
          { name: "lab_id" },
        ]
      },
      {
        name: "fk_financial_transaction_manager_key_idx",
        using: "BTREE",
        fields: [
          { name: "manager_key_id" },
        ]
      }
    ],
    hooks: {
      beforeValidate: (transaction) => {
        if (!transaction.transaction_code) {
          transaction.transaction_code = generateTxnCode();
        }
      }
    }
  });
};
