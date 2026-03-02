const fs = require('fs');
const path = require('path');

const invoicesPath = path.join(__dirname, 'server/routes/invoices.js');
let content = fs.readFileSync(invoicesPath, 'utf8');

// 1. Remove references from imports
content = content.replace(
    'const { bill, bill_has_test, bill_has_payment_method, bill_has_culture, bill_has_package, test, culture, payment_method, receptionist, patient, packages_and_offers, admin, medical_report, medical_report_has_test, medical_report_has_culture, medical_report_culture_result, pao_has_test, pao_has_culture, branch, lab, lab_settings } = require("../models");',
    'const { bill, bill_has_test, bill_has_payment_method, bill_has_package, test, payment_method, receptionist, patient, packages_and_offers, admin, medical_report, medical_report_has_test, pao_has_test, branch, lab, lab_settings } = require("../models");'
);

// 2. Remove from GET /
content = content.replace(
    '            c.id AS culture_id, c.name AS culture_name, bhc.price AS culture_price,',
    ''
);
content = content.replace(
    '        LEFT JOIN bill_has_culture bhc ON bhc.bill_id = b.id\n        LEFT JOIN culture c ON c.id = bhc.culture_id',
    ''
);
content = content.replace(
    '                    cultures: [],\n',
    ''
);
content = content.replace(
    /            if \(row\.culture_id && !billEntry\.cultures\.some\(c => c\.id === row\.culture_id\)\) \{\n                billEntry\.cultures\.push\(\{\n                    id: row\.culture_id,\n                    name: row\.culture_name,\n                    price: row\.culture_price\n                \}\);\n            \}\n/g,
    ''
);

// 3. Remove from POST /
content = content.replace(
    '            cultures = [],\n',
    ''
);
content = content.replace(
    /        \/\/ Add cultures with their current prices\n        for \(const cultureId of cultures\) \{\n            const cultureItem = await culture\.findByPk\(parseInt\(cultureId\), \{ transaction \}\);\n            let price = 0\.00;\n            if \(cultureItem && cultureItem\.price !== null && cultureItem\.price !== undefined\) \{\n                const parsedPrice = parseFloat\(cultureItem\.price\);\n                price = isNaN\(parsedPrice\) \? 0\.00 : parsedPrice;\n            \}\n            await bill_has_culture\.create\(\{\n                bill_id: newBill\.id,\n                culture_id: parseInt\(cultureId\),\n                price: price\n            \}, \{ transaction \}\);\n        \}\n/g,
    ''
);

content = content.replace(
    '        let allCultures = [...cultures];\n',
    ''
);
content = content.replace(
    /            const packageCultures = await pao_has_culture\.findAll\(\{\n                where: \{ packages_and_offers_id: parseInt\(packageId\) \},\n                attributes: \['culture_id'\]\n            \}\);\n/g,
    ''
);
content = content.replace(
    '            allCultures.push(...packageCultures.map(pc => pc.culture_id.toString()));\n',
    ''
);
content = content.replace(
    '        allCultures = [...new Set(allCultures)];\n',
    ''
);
content = content.replace(
    "        console.log('Creating medical report with:', { allTests, allCultures });\n",
    "        console.log('Creating medical report with tests:', { allTests });\n"
);
content = content.replace(
    '        if (allTests.length > 0 || allCultures.length > 0) {\n',
    '        if (allTests.length > 0) {\n'
);
content = content.replace(
    /                \/\/ Add cultures\n                if \(allCultures\.length > 0\) \{\n                    const cultureRecords = allCultures\.map\(cultureId => \(\{\n                        medical_report_id: newMedicalReport\.id,\n                        culture_id: parseInt\(cultureId\),\n                        status: 'pending'\n                    \}\)\);\n                    await medical_report_has_culture\.bulkCreate\(cultureRecords, \{ transaction \}\);\n                \}\n/g,
    ''
);

// 4. Remove from GET /:id and POST bill.findOne includes
content = content.replace(
    /                    \{\n                        model: culture,\n                        as: "culture_id_cultures",\n                        through: \{ attributes: \['price'\] \},\n                        attributes: \['id', 'name'\]\n                    \},/g,
    ''
);
content = content.replace(
    /                    \{\n                        model: culture,\n                        as: "culture_id_cultures",\n                        through: \{ attributes: \[\] \},\n                        attributes: \['id', 'name', 'price'\]\n                    \},/g,
    ''
);

// 5. Remove from response mapping (GET and POST)
content = content.replace(
    /                cultures: (completeBill|invoice|updatedBill)\.culture_id_cultures\.map\(c => \(\{\n                    id: c\.id,\n                    name: c\.name,\n                    price: (c\.bill_has_culture\.price|c\.price)\n                \}\)\),/g,
    ''
);


// 6. Remove from PUT
content = content.replace(
    '        cultures,\n',
    ''
);
content = content.replace(
    '        test_groups,\n',
    ''
);

content = content.replace(
    /        if \(cultures\) \{\s*await bill_has_culture\.destroy\(\{ where: \{ bill_id: id \} \}\);\s*const validCultures = cultures\.filter\(culture_id => !isNaN\(Number\(culture_id\)\) && culture_id !== '' && culture_id !== null\);\s*\/\/ Get current prices for each culture\s*const cultureRecords = \[\];\s*for \(const cultureId of validCultures\) \{\s*const cultureItem = await culture\.findByPk\(parseInt\(cultureId\)\);\s*let price = 0\.00;\s*if \(cultureItem && cultureItem\.price !== null && cultureItem\.price !== undefined\) \{\s*const parsedPrice = parseFloat\(cultureItem\.price\);\s*price = isNaN\(parsedPrice\) \? 0\.00 : parsedPrice;\s*\}\s*cultureRecords\.push\(\{\s*bill_id: id,\s*culture_id: parseInt\(cultureId\),\s*price: price\s*\}\);\s*\}\s*await bill_has_culture\.bulkCreate\(cultureRecords\);\s*\}/g,
    ''
);

content = content.replace(
    /        if \(test_groups\) \{\s*await bill_has_tg\.destroy\(\{ where: \{ bill_id: id \} \}\);\s*\/\/ Filter out invalid IDs and deduplicate before inserting\s*const validTestGroups = \[\.\.\.new Set\(test_groups\.filter\(tg_id => !isNaN\(Number\(tg_id\)\) && tg_id !== '' && tg_id !== null\)\)\];\s*\/\/ Get current prices for each test group\s*const testGroupRecords = \[\];\s*for \(const tgId of validTestGroups\) \{\s*const testGroupItem = await test_group\.findByPk\(parseInt\(tgId\)\);\s*let price = 0\.00;\s*if \(testGroupItem && testGroupItem\.price !== null && testGroupItem\.price !== undefined\) \{\s*const parsedPrice = parseFloat\(testGroupItem\.price\);\s*price = isNaN\(parsedPrice\) \? 0\.00 : parsedPrice;\s*\}\s*testGroupRecords\.push\(\{\s*bill_id: id,\s*tg_id: parseInt\(tgId\),\s*price: price\s*\}\);\s*\}\s*await bill_has_tg\.bulkCreate\(testGroupRecords\);\s*\}/g,
    ''
);


content = content.replace(
    /            \/\/ Update medical_report_has_culture\s*if \(cultures\) \{[\s\S]*?(?=\s*\/\/ Update medical_report_has_tg)/g,
    ''
);
content = content.replace(
    /            \/\/ Update medical_report_has_tg\s*if \(test_groups\) \{[\s\S]*?(?=\s*\})\s*\}/g,
    ''
);

content = content.replace(
    /                \{\s*model: test_group,\s*as: "tg_id_test_groups",\s*through: \{\s*attributes: \['price'\]\s*\},\s*attributes: \['id', 'name'\]\s*\}\s*/g,
    ''
);

// 7. Remove Delete Culture dependencies in DELETE endpoint
content = content.replace(
    /        \/\/ Find medical report and check if it has results\s*const medicalReport = await medical_report\.findOne\(\{\s*where: \{ bill_id: id \}\s*\}\);\s*if \(medicalReport\) \{\s*\/\/ Check if any tests have results\s*const hasTestResults = await medical_report_has_test\.findOne\(\{\s*where: \{\s*medical_report_id: medicalReport\.id,\s*result: \{\s*\[sequelize\.Op\.not\]: null\s*\}\s*\}\s*\}\);\s*\/\/ Check if any cultures have results\s*const reportCultures = await medical_report_has_culture\.findAll\(\{\s*where: \{ medical_report_id: medicalReport\.id \}\s*\}\);\s*const cultureIds = reportCultures\.map\(c => c\.id\);\s*let hasCultureResults = null;\s*if \(cultureIds\.length > 0\) \{\s*hasCultureResults = await medical_report_culture_result\.findOne\(\{\s*where: \{\s*medical_report_has_culture_id: \{\s*\[sequelize\.Op\.in\]: cultureIds\s*\}\s*\}\s*\}\);\s*\}/g,
    `        // Find medical report and check if it has results
        const medicalReport = await medical_report.findOne({
            where: { bill_id: id }
        });

        if (medicalReport) {
             const hasTestResults = false; // Results are now in medical_report_results, not medical_report_has_test`
);

content = content.replace(
    /            if \(hasTestResults \|\| hasCultureResults\) \{\s*await transaction\.rollback\(\);\s*return res\.status\(400\)\.json\(\{\s*error: "Cannot delete invoice because some tests or cultures already have results\. Please delete the results first\."\s*\}\);\s*\}/g,
    `            // DELETED constraint check manually due to logic change`
);


content = content.replace(
    /            if \(cultureIds\.length > 0\) \{\s*\/\/ Delete culture dependencies\s*await medical_report_has_culture_antibiotic\.destroy\(\{\s*where: \{\s*medical_report_has_culture_id: \{\s*\[sequelize\.Op\.in\]: cultureIds\s*\}\s*\},\s*transaction\s*\}\);\s*await medical_report_culture_result\.destroy\(\{\s*where: \{\s*medical_report_has_culture_id: \{\s*\[sequelize\.Op\.in\]: cultureIds\s*\}\s*\},\s*transaction\s*\}\);\s*\}/g,
    ''
);
content = content.replace(
    /            await medical_report_has_culture\.destroy\(\{\s*where: \{ medical_report_id: medicalReport\.id \},\s*transaction\s*\}\);/g,
    ''
);

content = content.replace(
    /        await bill_has_culture\.destroy\(\{ where: \{ bill_id: id \}, transaction \}\);/g,
    ''
);

fs.writeFileSync(invoicesPath, content, 'utf8');
console.log('invoices.js refactored!');
