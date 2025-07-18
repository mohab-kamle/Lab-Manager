const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('test_has_question', {
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'test',
        key: 'id'
      }
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'question',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'test_has_question',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "test_id" },
          { name: "question_id" },
        ]
      },
      {
        name: "fk_test_has_question_question1_idx",
        using: "BTREE",
        fields: [
          { name: "question_id" },
        ]
      }
    ]
  });
}; 