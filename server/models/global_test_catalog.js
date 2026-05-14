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
        type: {
            type: DataTypes.ENUM('single', 'panel', 'culture'),
            allowNull: false,
            defaultValue: 'single' // Ziad will use this for frontend filtering
        },
        order_rank: {
            type: DataTypes.INTEGER,
            allowNull: true // From COMMON_ORDER_RANK, helps with search sorting
        },
        patient_friendly_name: {
            type: DataTypes.STRING,
            allowNull: true // From ConsumerName, used for the final patient PDF
        },
        global_category: {
            type: DataTypes.STRING,
            allowNull: true // The universal LOINC department (e.g., 'Microbiology')
        },
        default_structure: {
            type: DataTypes.JSON,
            allowNull: true
        },
        default_sample_type_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'sample_type',
                key: 'id'
            }
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
            {
                name: "fk_global_test_catalog_sample_type_idx",
                using: "BTREE",
                fields: [
                    { name: "default_sample_type_id" },
                ]
            },
        ]
    });
};
