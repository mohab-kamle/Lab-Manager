const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
    return sequelize.define('global_test_catalog', {
        id: {
            type: DataTypes.STRING(36),
            allowNull: false,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        loinc_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: "loinc_code_UNIQUE"
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        default_structure: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        sequelize,
        tableName: 'global_test_catalog',
        timestamps: true,
        charset: 'latin1',
        collate: 'latin1_swedish_ci',
        engine: 'InnoDB',
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
                name: "loinc_code_UNIQUE",
                unique: true,
                using: "BTREE",
                fields: [
                    { name: "loinc_code" },
                ]
            },
        ]
    });
};
