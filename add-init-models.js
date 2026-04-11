const fs = require('fs');
const path = require('path');

const initModelsPath = path.join(__dirname, 'server/models/init-models.js');
let content = fs.readFileSync(initModelsPath, 'utf8');

// Insert new requires
const insertRequires = `
var _medical_report_results = require("./medical_report_results");
var _lab_samples = require("./lab_samples");
`;

content = content.replace(
    'var _medical_report_has_test = require("./medical_report_has_test");\n',
    'var _medical_report_has_test = require("./medical_report_has_test");\n' + insertRequires
);


// Insert new declarations
const insertDeclarations = `
  var medical_report_results = _medical_report_results(sequelize, DataTypes);
  var lab_samples = _lab_samples(sequelize, DataTypes);
`;

content = content.replace(
    '  var medical_report_has_test = _medical_report_has_test(sequelize, DataTypes);\n',
    '  var medical_report_has_test = _medical_report_has_test(sequelize, DataTypes);\n' + insertDeclarations
);

// Add associations
const associations = `
  medical_report_results.belongsTo(medical_report, { as: "medical_report", foreignKey: "medical_report_id"});
  medical_report.hasMany(medical_report_results, { as: "medical_report_results", foreignKey: "medical_report_id"});
  medical_report_results.belongsTo(test, { as: "test", foreignKey: "test_id"});
  test.hasMany(medical_report_results, { as: "medical_report_results", foreignKey: "test_id"});
  
  lab_samples.belongsTo(medical_report, { as: "medical_report", foreignKey: "medical_report_id"});
  medical_report.hasMany(lab_samples, { as: "lab_samples", foreignKey: "medical_report_id"});
`;

content = content.replace(
    '  return {\n',
    associations + '\n  return {\n'
);

// Add to return block
content = content.replace(
    '    medical_report_has_test,\n',
    '    medical_report_has_test,\n    medical_report_results,\n    lab_samples,\n'
);

fs.writeFileSync(initModelsPath, content, 'utf8');
console.log('Added new models to init-models.js');
