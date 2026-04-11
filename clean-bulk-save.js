const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'server', 'routes', 'medical_reports.js');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove culture arrays from destructuring in bulk-save
content = content.replace(
    /\s*culture_results = \[\]\,/g,
    ''
);
content = content.replace(
    /\s*culture_antibiotics = \{\}\,/g,
    ''
);
content = content.replace(
    /\s*culture_options = \{\}\,/g,
    ''
);

// 2. Remove culture keys from logging in bulk-save
content = content.replace(
    /\s*culture_results: culture_results\.length\,/g,
    ''
);
content = content.replace(
    /\s*culture_antibiotics: Object\.keys\(culture_antibiotics\)\.length\,/g,
    ''
);
content = content.replace(
    /\s*culture_options: Object\.keys\(culture_options\)\.length\,/g,
    ''
);

// 3. Remove "Save culture results" block (approx. lines 2200-2247)
content = content.replace(
    /\s*\/\/ 3\. Save culture results\s*if \(culture_results\.length > 0\) \{[\s\S]*?(?=\s*\/\/ 4\. Save test group values)/,
    '\n'
);

// 4. Remove "Save culture antibiotics" block (approx. lines 2277-2300+)
content = content.replace(
    /\s*\/\/ 5\. Save culture antibiotics \(if any\)\s*if \(Object\.keys\(culture_antibiotics\)\.length > 0\) \{[\s\S]*?(?=\s*\/\/ Fetch the updated report with all associations)/,
    '\n'
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully cleaned bulk-save route in medical_reports.js');
