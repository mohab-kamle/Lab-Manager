const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
    return sequelize.define('lab_samples', {
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        sample_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: "sample_id_UNIQUE"
        },
        medical_report_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        test_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        sample_type_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'Pending Collection'
        },
        status_history: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        sequelize,
        tableName: 'lab_samples',
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
                name: "sample_id_UNIQUE",
                unique: true,
                using: "BTREE",
                fields: [
                    { name: "sample_id" },
                ]
            }
        ]
    });
};
