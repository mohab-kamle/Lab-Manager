const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
    return sequelize.define('medical_report_results', {
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        medical_report_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'medical_report',
                key: 'id'
            }
        },
        test_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'test',
                key: 'id'
            }
        },
        parameter_key: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        result_value: {
            type: DataTypes.JSON,
            allowNull: true
        },
        clinical_flag: {
            type: DataTypes.ENUM('normal', 'low', 'high', 'panic_low', 'panic_high'),
            allowNull: true
        },
        workflow_status: {
            type: DataTypes.ENUM('pending', 'collected', 'analyzed', 'approved'),
            allowNull: true,
            defaultValue: "pending"
        }
    }, {
        sequelize,
        tableName: 'medical_report_results',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
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
                name: "fk_medical_report_results_medical_report_idx",
                using: "BTREE",
                fields: [
                    { name: "medical_report_id" },
                ]
            },
            {
                name: "fk_medical_report_results_test_idx",
                using: "BTREE",
                fields: [
                    { name: "test_id" },
                ]
            },
        ]
    });
};
