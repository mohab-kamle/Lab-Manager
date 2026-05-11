const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reconciliation_item', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    reconciliation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'reconciliation',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE' 
    },
    bill_id: { // Matches your 'bill' model, not 'invoice'
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bill',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    amount_applied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount from the reconciliation applied to this specific bill'
    }
  }, {
    sequelize,
    tableName: 'reconciliation_item',
    timestamps: false,
  });
};