const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'server', 'routes', 'medical_reports.js');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove references to culture caches
content = content.replace(/invalidateCultureResultsCache, /g, '');

// 2. Remove cultures from GET /
content = content.replace(
    /,\s*{\s*model: db\.culture,\s*as: "cultures",\s*through: { attributes: \[\] },\s*attributes: \["id", "name"\],\s*}/g,
    ''
);
content = content.replace(/cultures: reportData\.cultures \|\| \[\],\s*/g, '');
content = content.replace(/cultures_count: \(reportData\.cultures \|\| \[\]\)\.length,\s*/g, '');

// 3. Remove cultures from GET /:id (optimized query)
content = content.replace(
    /,\s*{\s*model: db\.medical_report_has_culture,([\s\S]*?)as: "culture",\s*attributes: \["id", "name"\],\s*},\s*\],\s*}/g,
    ''
);

// 4. Remove cultures from GET /:id (full query)
content = content.replace(
    /,\s*{\s*model: db\.medical_report_has_culture,([\s\S]*?)as: "culture",\s*attributes: \["id", "name"\],\s*},\s*\],\s*}/g,
    ''
);
content = content.replace(/cultures_count: reportData\.medical_report_has_cultures\?\.length \|\| 0,\s*/g, '');

// 5. Remove cultures from POST /
content = content.replace(/culture_ids,\s*/g, '');
content = content.replace(
    /\s*\/\/ Associate cultures if provided\s*if \(culture_ids && culture_ids\.length > 0\) {[\s\S]*?}\s*/,
    '\n'
);
content = content.replace(
    /,\s*{\s*model: db\.culture,\s*as: "cultures",\s*through: {[\s\S]*?},\s*attributes: \["id", "name"\],\s*}/g,
    ''
);

// 6. Remove cultures from PUT /:id
content = content.replace(/culture_results,\s*/g, '');
content = content.replace(
    /\s*\/\/ Update culture results if provided\s*if \(culture_results\) {[\s\S]*?(?=\s*\/\/ Fetch the updated report with associations)/,
    '\n'
);

// 7. Remove culture diagnostic endpoints
content = content.replace(
    /\/\/\s*Diagnostic endpoint to check culture associations\s*router\.get\([\s\S]*?\}\s*\);\s*/,
    ''
);

// 8. Remove cultures from PUT /:id/results
content = content.replace(/, culture_results( } = req\.body;)/g, '$1');
content = content.replace(
    /\s*\/\/ Update culture results\s*if \(culture_results\) {[\s\S]*?(?=\s*\/\/ Fetch the updated report with all associations)/,
    '\n'
);

// 9. Remove cultures from GET /:id/results-data
content = content.replace(
    /,\s* cultures\] = await Promise\.all\(\[[\s\S]*?db\.medical_report_has_culture\.findAll\(\{[\s\S]*?\}\),\s*\]\);/g,
    '] = await Promise.all([\n        testIds.length > 0 ? await db.test.findAll({\n          where: { id: testIds }\n        }) : []\n      ]);'
);
content = content.replace(/reportData\.cultures = cultures\.map\(\(c\) => c\.get\(\{ plain: true \}\)\);\s*/g, '');

// 10. Remove cultures from POST /bulk-save
content = content.replace(
    /,\s*{\s*model: db\.medical_report_has_culture,\s*as: "cultures",\s*include: \[[\s\S]*?\]\s*}/g,
    ''
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully cleaned medical_reports.js GET, POST, PUT, and results routes');
