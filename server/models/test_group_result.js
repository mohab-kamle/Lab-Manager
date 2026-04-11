module.exports = function (sequelize, DataTypes) {
  const TestGroupResult = sequelize.define('test_group_result', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    medical_report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'medical_report', key: 'id' }
    },
    test_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'test_group', key: 'id' }
    },
    tg_component_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tg_component', key: 'id' }
    },
    result_json: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('result_json');
        return typeof rawValue === 'string'
          ? JSON.parse(rawValue)
          : rawValue;
      },
      set(value) {
        this.setDataValue('result_json', value);
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'test_group_result',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_test_group_result_medical_report', fields: ['medical_report_id'] },
      { name: 'idx_test_group_result_test_group', fields: ['test_group_id'] },
      { name: 'idx_test_group_result_component', fields: ['tg_component_id'] },
      { name: 'idx_test_group_result_composite', fields: ['medical_report_id', 'test_group_id', 'tg_component_id'], unique: true }
    ]
  });

  // ✅ Override toJSON for all instances
  TestGroupResult.prototype.toJSON = function () {
    const values = { ...this.get() };
    values.results = values.result_json;
    delete values.result_json;
    return values;
  };

  return TestGroupResult;
};
