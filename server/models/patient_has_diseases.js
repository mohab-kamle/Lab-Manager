const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('patient_has_diseases', {
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'patient',
        key: 'id'
      }
    },
    diseases_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'diseases',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'patient_has_diseases',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "patient_id" },
          { name: "diseases_id" },
        ]
      },
      {
        name: "fk_patient_has_diseases_diseases1_idx",
        using: "BTREE",
        fields: [
          { name: "diseases_id" },
        ]
      },
      {
        name: "fk_patient_has_diseases_patient1_idx",
        using: "BTREE",
        fields: [
          { name: "patient_id" },
        ]
      },
    ]
  });
};
