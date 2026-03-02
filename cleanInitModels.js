const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'server/models/init-models.js');
let content = fs.readFileSync(file, 'utf8');

const badModels = [
    'test_group', 'test_component', 'test_group_result', 'tgc_category', 'tg_component',
    'tg_fields', 'field_comp_options', 'test_group_comments', 'medical_report_has_tg', 'bill_has_tg'
];

// 1. Remove require statements and variable initializations
badModels.forEach(m => {
    const reqRegex = new RegExp(`^.*require\\(["']./${m}["']\\);.*\\r?\\n`, 'gm');
    content = content.replace(reqRegex, '');

    const initRegex = new RegExp(`^.*var ${m} = _${m}\\(sequelize, DataTypes\\);.*\\r?\\n`, 'gm');
    content = content.replace(initRegex, '');

    const exportRegex = new RegExp(`^[ \\t]*${m},[ \\t]*\\r?\\n`, 'gm');
    content = content.replace(exportRegex, '');
});

// 2. Remove multi-line associations
const assocRegex = /^[ \t]*([a-zA-Z_]+)\.(belongsTo|hasMany|belongsToMany|hasOne)\(([a-zA-Z_]+), \{[\s\S]*?\}\);?[\r\n]+/gm;

content = content.replace(assocRegex, (match, m1, relation, m2) => {
    if (badModels.includes(m1) || badModels.includes(m2)) {
        return "";
    }
    for (let bad of badModels) {
        // If the association uses a bad model as a join table
        if (match.includes(`through: ${bad},`) || match.includes(`through: ${bad}\n`) || match.includes(`through: ${bad}\r`)) {
            return "";
        }
    }
    return match;
});

// 3. Remove single-line comments mentioning them just in case they were left behind
const commentRegex = /^[ \t]*\/\/.*(?:test_group|test_component|medical_report_tg_field_value).*[\r\n]+/gm;
content = content.replace(commentRegex, '');

fs.writeFileSync(file, content);
console.log("Successfully cleaned init-models.js!");
