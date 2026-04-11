const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'server', 'models', 'init-models.js');
let content = fs.readFileSync(targetFile, 'utf8');

const obsoleteModels = [
    'cultures',
    'culture_antibiotics',
    'culture_results',
    'test_components',
    'test_groups',
    'test_group_test',
    'medical_report_has_culture',
    'medical_report_culture_result',
    'medical_report_has_culture_antibiotic',
    'contract_has_culture',
    'pao_has_culture',
    'bill_has_culture',
    'culture'
];

let lines = content.split('\n');
let filteredLines = [];
let skipBlock = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains a require, var declaration, or export for an obsolete model
    let isObsoleteLine = false;
    for (const model of obsoleteModels) {
        // Match `var _model = require("./model");`
        if (new RegExp(`var _${model} = require\\("\\.\\/${model}"\\);`).test(line)) {
            isObsoleteLine = true;
            break;
        }

        // Match `var model = _model(sequelize, DataTypes);`
        if (new RegExp(`var ${model} = _${model}\\(sequelize, DataTypes\\);`).test(line)) {
            isObsoleteLine = true;
            break;
        }

        // Match `model,` in the return block
        if (new RegExp(`^\\s*${model},$`).test(line)) {
            isObsoleteLine = true;
            break;
        }
    }

    if (isObsoleteLine) continue;

    // Check for association blocks. An association block starts with `model1.belongsTo/hasMany/belongsToMany(model2`
    // We want to skip the entire block until `});` if either model1 or model2 is obsolete.
    let isAssociationStart = false;
    for (const model of obsoleteModels) {
        if (
            new RegExp(`^\\s*${model}\\.(belongsTo|hasMany|belongsToMany|hasOne)\\(`).test(line) ||
            new RegExp(`\\.(belongsTo|hasMany|belongsToMany|hasOne)\\(${model},`).test(line)
        ) {
            isAssociationStart = true;
            break;
        }
    }

    if (isAssociationStart) {
        skipBlock = true;
    }

    if (skipBlock) {
        if (line.trim() === '});') {
            skipBlock = false; // end of block
        }
        continue;
    }

    filteredLines.push(line);
}

fs.writeFileSync(targetFile, filteredLines.join('\n'), 'utf8');
console.log('Successfully cleaned init-models.js');
