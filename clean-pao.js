const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/routes/packages_and_offers.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
    'const { packages_and_offers, pao_has_test, pao_has_culture, admin_packages_and_offers, test, culture } = require(\'../models\');',
    'const { packages_and_offers, pao_has_test, admin_packages_and_offers, test } = require(\'../models\');'
);

// 2. GET / (all packages and offers)
content = content.replace(
    /        const \[testAssociations, cultureAssociations\] = await Promise\.all\(\[\s+pao_has_test\.findAll\(\{\s+where: \{ packages_and_offers_id: packageAndOfferIds \}\s+\}\),\s+pao_has_culture\.findAll\(\{\s+where: \{ packages_and_offers_id: packageAndOfferIds \}\s+\}\)\s+\]\);\s+console\.log\('Test associations:', testAssociations\.length\);\s+console\.log\('Culture associations:', cultureAssociations\.length\);/g,
    `        const testAssociations = await pao_has_test.findAll({
            where: { packages_and_offers_id: packageAndOfferIds }
        });
        console.log('Test associations:', testAssociations.length);`
);

content = content.replace(
    /        const testIds = \[\.\.\.new Set\(testAssociations\.map\(t => t\.test_id\)\)\];\s+const cultureIds = \[\.\.\.new Set\(cultureAssociations\.map\(c => c\.culture_id\)\)\];\s+console\.log\('Unique test IDs:', testIds\);\s+console\.log\('Unique culture IDs:', cultureIds\);/g,
    `        const testIds = [...new Set(testAssociations.map(t => t.test_id))];
        console.log('Unique test IDs:', testIds);`
);

content = content.replace(
    /        const \[tests, cultures\] = await Promise\.all\(\[\s+testIds\.length > 0 \? test\.findAll\(\{ where: \{ id: testIds \} \}\) : \[\],\s+cultureIds\.length > 0 \? culture\.findAll\(\{ where: \{ id: cultureIds \} \}\) : \[\]\s+\]\);\s+console\.log\('Found tests:', tests\.length\);\s+console\.log\('Found cultures:', cultures\.length\);/g,
    `        const tests = testIds.length > 0 ? await test.findAll({ where: { id: testIds } }) : [];
        console.log('Found tests:', tests.length);`
);

content = content.replace(
    /        const testMap = new Map\(tests\.map\(t => \[t\.id, t\]\)\);\s+const cultureMap = new Map\(cultures\.map\(c => \[c\.id, c\]\)\);/g,
    `        const testMap = new Map(tests.map(t => [t.id, t]));`
);

content = content.replace(
    /        const result = packagesAndOffers\.map\(item => \{\s+const itemTests = testAssociations\s+\.filter\(t => t\.packages_and_offers_id === item\.id\)\s+\.map\(t => testMap\.get\(t\.test_id\)\)\s+\.filter\(Boolean\); \/\/ Remove any undefined values\s+const itemCultures = cultureAssociations\s+\.filter\(c => c\.packages_and_offers_id === item\.id\)\s+\.map\(c => cultureMap\.get\(c\.culture_id\)\)\s+\.filter\(Boolean\); \/\/ Remove any undefined values\s+console\.log\(\`Package \$\{item\.id\} has \$\{itemTests\.length\} tests and \$\{itemCultures\.length\} cultures\`\);\s+return \{\s+\.\.\.item\.toJSON\(\),\s+tests: itemTests,\s+cultures: itemCultures\s+\};\s+\}\);/g,
    `        const result = packagesAndOffers.map(item => {
            const itemTests = testAssociations
                .filter(t => t.packages_and_offers_id === item.id)
                .map(t => testMap.get(t.test_id))
                .filter(Boolean);

            console.log(\`Package \${item.id} has \${itemTests.length} tests\`);

            return {
                ...item.toJSON(),
                tests: itemTests
            };
        });`
);

// 3. GET /:id (single package/offer)
content = content.replace(
    /        const \[testAssociations, cultureAssociations\] = await Promise\.all\(\[\s+pao_has_test\.findAll\(\{\s+where: \{ packages_and_offers_id: req\.params\.id \}\s+\}\),\s+pao_has_culture\.findAll\(\{\s+where: \{ packages_and_offers_id: req\.params\.id \}\s+\}\)\s+\]\);\s+\/\/ Get test and culture IDs\s+const testIds = testAssociations\.map\(t => t\.test_id\);\s+const cultureIds = cultureAssociations\.map\(c => c\.culture_id\);\s+\/\/ Fetch tests and cultures\s+const \[tests, cultures\] = await Promise\.all\(\[\s+testIds\.length > 0 \? test\.findAll\(\{ where: \{ id: testIds \} \}\) : \[\],\s+cultureIds\.length > 0 \? culture\.findAll\(\{ where: \{ id: cultureIds \} \}\) : \[\]\s+\]\);\s+const result = \{\s+\.\.\.packageAndOffer\.toJSON\(\),\s+tests: tests,\s+cultures: cultures\s+\};/g,
    `        const testAssociations = await pao_has_test.findAll({
            where: { packages_and_offers_id: req.params.id }
        });

        const testIds = testAssociations.map(t => t.test_id);
        const tests = testIds.length > 0 ? await test.findAll({ where: { id: testIds } }) : [];

        const result = {
            ...packageAndOffer.toJSON(),
            tests: tests
        };`
);

// 4. POST / (create new)
content = content.replace(
    'const { name, shortcut, price, start_date, end_date, type, tests, cultures, item_id, item_type } = req.body;',
    'const { name, shortcut, price, start_date, end_date, type, tests, item_id, item_type } = req.body;'
);
content = content.replace(
    'console.log(\'Received request body:\', { name, shortcut, price, start_date, end_date, type, tests, cultures, item_id, item_type });',
    'console.log(\'Received request body:\', { name, shortcut, price, start_date, end_date, type, tests, item_id, item_type });'
);

content = content.replace(
    /            \/\/ Handle cultures\s+if \(cultures && cultures\.length > 0\) \{\s+\/\/ First verify that all culture IDs exist and are valid numbers\s+const cultureIds = cultures\.map\(id => parseInt\(id\)\);\s+if \(cultureIds\.some\(isNaN\)\) \{\s+await transaction\.rollback\(\);\s+return res\.status\(400\)\.json\(\{ error: 'Invalid culture IDs provided' \}\);\s+\}\s+const existingCultures = await culture\.findAll\(\{\s+where: \{ id: cultureIds \}\s+\}\);\s+if \(existingCultures\.length !== cultures\.length\) \{\s+await transaction\.rollback\(\);\s+return res\.status\(400\)\.json\(\{ error: 'One or more culture IDs do not exist' \}\);\s+\}\s+await Promise\.all\(cultures\.map\(cultureId =>\s+pao_has_culture\.create\(\{\s+packages_and_offers_id: newPackageAndOffer\.id,\s+culture_id: parseInt\(cultureId\)\s+\}, \{ transaction \}\)\s+\)\);\s+\}/g,
    ''
);

content = content.replace(
    /                \} else if \(item_type === "culture"\) \{\s+await pao_has_culture\.create\(\{\s+packages_and_offers_id: newPackageAndOffer\.id,\s+culture_id: item_id\s+\}, \{ transaction \}\);\s+\}/g,
    ''
);

content = content.replace(
    /            const \[testAssociations, cultureAssociations\] = await Promise\.all\(\[\s+pao_has_test\.findAll\(\{\s+where: \{ packages_and_offers_id: newPackageAndOffer\.id \}\s+\}\),\s+pao_has_culture\.findAll\(\{\s+where: \{ packages_and_offers_id: newPackageAndOffer\.id \}\s+\}\)\s+\]\);\s+\/\/ Get test and culture IDs\s+const testIds = testAssociations\.map\(t => t\.test_id\);\s+const cultureIds = cultureAssociations\.map\(c => c\.culture_id\);\s+\/\/ Fetch tests and cultures\s+const \[createdTests, createdCultures\] = await Promise\.all\(\[\s+testIds\.length > 0 \? test\.findAll\(\{ where: \{ id: testIds \} \}\) : \[\],\s+cultureIds\.length > 0 \? culture\.findAll\(\{ where: \{ id: cultureIds \} \}\) : \[\]\s+\]\);\s+const result = \{\s+\.\.\.newPackageAndOffer\.toJSON\(\),\s+tests: createdTests,\s+cultures: createdCultures\s+\};/g,
    `            const testAssociations = await pao_has_test.findAll({
                where: { packages_and_offers_id: newPackageAndOffer.id }
            });

            const testIds = testAssociations.map(t => t.test_id);
            const createdTests = testIds.length > 0 ? await test.findAll({ where: { id: testIds } }) : [];

            const result = {
                ...newPackageAndOffer.toJSON(),
                tests: createdTests
            };`
);

// 5. PUT /:id (update)
content = content.replace(
    'const { name, shortcut, price, start_date, end_date, type, tests, cultures, item_id, item_type } = req.body;',
    'const { name, shortcut, price, start_date, end_date, type, tests, item_id, item_type } = req.body;'
);

content = content.replace(
    /            await pao_has_culture\.destroy\(\{\s+where: \{ packages_and_offers_id: req\.params\.id \},\s+transaction\s+\}\);/g,
    ''
);

content = content.replace(
    /                \/\/ Handle package cultures\s+if \(cultures && cultures\.length > 0\) \{\s+await Promise\.all\(cultures\.map\(cultureId =>\s+pao_has_culture\.create\(\{\s+packages_and_offers_id: req\.params\.id,\s+culture_id: parseInt\(cultureId\)\s+\}, \{ transaction \}\)\s+\)\);\s+\}/g,
    ''
);

content = content.replace(
    /                    \} else if \(item_type === "culture"\) \{\s+await pao_has_culture\.create\(\{\s+packages_and_offers_id: req\.params\.id,\s+culture_id: item_id\s+\}, \{ transaction \}\);\s+\}/g,
    ''
);

content = content.replace(
    /            const \[testAssociations, cultureAssociations\] = await Promise\.all\(\[\s+pao_has_test\.findAll\(\{\s+where: \{ packages_and_offers_id: req\.params\.id \}\s+\}\),\s+pao_has_culture\.findAll\(\{\s+where: \{ packages_and_offers_id: req\.params\.id \}\s+\}\)\s+\]\);\s+\/\/ Get test and culture IDs\s+const testIds = testAssociations\.map\(t => t\.test_id\);\s+const cultureIds = cultureAssociations\.map\(c => c\.culture_id\);\s+\/\/ Fetch tests and cultures\s+const \[updatedTests, updatedCultures\] = await Promise\.all\(\[\s+testIds\.length > 0 \? test\.findAll\(\{ where: \{ id: testIds \} \}\) : \[\],\s+cultureIds\.length > 0 \? culture\.findAll\(\{ where: \{ id: cultureIds \} \}\) : \[\]\s+\]\);\s+const result = \{\s+\.\.\.packageAndOffer\.toJSON\(\),\s+tests: updatedTests,\s+cultures: updatedCultures\s+\};/g,
    `            const testAssociations = await pao_has_test.findAll({
                where: { packages_and_offers_id: req.params.id }
            });

            const testIds = testAssociations.map(t => t.test_id);
            const updatedTests = testIds.length > 0 ? await test.findAll({ where: { id: testIds } }) : [];

            const result = {
                ...packageAndOffer.toJSON(),
                tests: updatedTests
            };`
);

// 6. DELETE /:id
content = content.replace(
    /            \/\/ Delete from pao_has_culture\s+await pao_has_culture\.destroy\(\{\s+where: \{ packages_and_offers_id: req\.params\.id \},\s+transaction\s+\}\);/g,
    ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('packages_and_offers.js refactored!');
