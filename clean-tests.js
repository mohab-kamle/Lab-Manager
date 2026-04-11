const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/routes/tests.js');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    /    try \{\s+\/\/ 1\. Delete test components\s+deletedComponents = await db\.test_component\.destroy\(\{\s+where: \{ test_id: req\.params\.id \}\s+\}\);\s+console\.log\(\`Deleted \$\{deletedComponents\} test components\`\);\s+\} catch \(error\) \{\s+console\.log\(\`Error deleting test components: \$\{error\.message\}\`\);\s+\}/g,
    ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('tests.js refactored!');
