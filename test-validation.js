const { validateExcelBuffer } = require('./server/services/excelService');

const result1 = validateExcelBuffer(null);
console.log('Result 1 (null):', result1);

const result2 = validateExcelBuffer(Buffer.from([]));
console.log('Result 2 (empty):', result2);

const result3 = validateExcelBuffer(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
console.log('Result 3 (valid header):', result3);
