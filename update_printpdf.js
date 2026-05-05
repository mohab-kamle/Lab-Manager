const fs = require('fs');

let content = fs.readFileSync('client/src/components/pdf/PrintPDF.jsx', 'utf8');

// 1. Remove useBarcode function
content = content.replace(/\/\/ Helper to generate barcode as data URL\nfunction useBarcode\(value\) \{[\s\S]*?\}\n/, '');

// 2. Remove useQrPngDataUrl function
content = content.replace(/\/\/ Helper: generate PNG QR code as data URL\nfunction useQrPngDataUrl\(value\) \{[\s\S]*?\}\n/, '');

// 3. Update ProfessionalPDFDocument barcodeUrl
content = content.replace(
  /const barcodeUrl = useBarcode\(report\?\.id \? String\(report\.id\) : "0"\);/,
  'const barcodeUrl = useUniversalCode("barcode", report?.id ? String(report.id) : "0");'
);

// 4. Update PrintPDF qrUrl
content = content.replace(
  /const qrUrl = useQrPngDataUrl\([\s\S]*?`https:\/\/doctorslab\.com\/patient\?patientcode=\$\{patient\?\.patientcode \|\| ""\}`\n\s*\);/,
  'const qrUrl = useUniversalCode("qrcode", `https://doctorslab.com/patient?patientcode=${patient?.patientcode || ""}`);'
);

// 5. Update DirectPDFDownload qrUrl
content = content.replace(
  /const qrUrl = useQrPngDataUrl\([\s\S]*?`https:\/\/doctorslab\.com\/patient\?patientcode=\$\{patient\?\.patientcode \|\| ""\}`\n\s*\);/,
  'const qrUrl = useUniversalCode("qrcode", `https://doctorslab.com/patient?patientcode=${patient?.patientcode || ""}`);'
);

fs.writeFileSync('client/src/components/pdf/PrintPDF.jsx', content);
console.log('Successfully updated PrintPDF.jsx');
