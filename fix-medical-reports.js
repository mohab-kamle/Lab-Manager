const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'server', 'routes', 'medical_reports.js');
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /\nif \(!medicalReport\) {\s*return res\.status\(404\)\.json\(\{ error: "Medical report not found" \}\);\s*}\s*\/\/ Also get all cultures in the system for comparison\s*const allCultures = await db\.culture\.findAll\(\{\s*attributes: \["id", "name"\],\s*\}\);\s*res\.json\(\{\s*medicalReport: \{\s*id: medicalReport\.id,\s*date: medicalReport\.date,\s*patient_id: medicalReport\.patient_id,\s*\},\s*associatedCultures: medicalReport\.cultures \|\| \[\],\s*cultureAssociations: medicalReport\.medical_report_has_cultures \|\| \[\],\s*allCultures: allCultures,\s*summary: \{\s*totalCulturesInSystem: allCultures\.length,\s*culturesAssociatedWithReport: medicalReport\.cultures\?\.length \|\| 0,\s*cultureAssociationsCount:\s*medicalReport\.medical_report_has_cultures\?\.length \|\| 0,\s*\},\s*\}\);\s*\} catch \(error\) {\s*console\.error\("Error checking culture associations:", error\);\s*res\.status\(500\)\.json\(\{ error: "Failed to check culture associations" \}\);\s*\}[\n\s]*\}\s*\);/

const newContent = content.replace(regex, '');

if (content !== newContent) {
    fs.writeFileSync(targetFile, newContent, 'utf8');
    console.log('Successfully fixed orphaned block syntax error in medical_reports.js');
} else {
    console.log('Failed to matched orphaned block Regex in medical_reports.js');
}
