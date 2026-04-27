const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('outsourced_lab', {
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
    contact_number: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'outsourced_lab',
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
        name: "unique_outsourced_lab_name_per_lab",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
          { name: "lab_id" }
        ]
      },
      {
        name: "fk_outsourced_lab_lab_idx",
        using: "BTREE",
        fields: [
          { name: "lab_id" }
        ]
      }
    ]
  });
};
