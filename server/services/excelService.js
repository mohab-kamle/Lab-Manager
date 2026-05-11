/**
 * Secure Excel Service using ExcelJS
 * Replaces the vulnerable xlsx package with a safer alternative
 * 
 * This service provides secure Excel file reading and writing capabilities
 * without the security vulnerabilities present in the xlsx package.
 */

const ExcelJS = require('exceljs');

/**
 * Read Excel file buffer and convert to JSON
<<<<<<< HEAD
 * @param {Buffer} buffer - The Excel file buffer
 * @param {string} sheetName - Name of the worksheet to read (optional)
 * @returns {Promise<Array>} - Array of objects representing the data
 */
async function readExcelBuffer(buffer, sheetName = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
=======
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimetype - The file mimetype (optional)
 * @param {string} sheetName - Name of the worksheet to read (optional)
 * @returns {Promise<Array>} - Array of objects representing the data
 */
async function readExcelBuffer(buffer, mimetype = null, sheetName = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    
    if (mimetype === 'text/csv' || (mimetype === null && !buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04])) && !buffer.slice(0, 4).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0])))) {
      // Try loading as CSV if mimetype is text/csv or if no Excel signature is found
      await workbook.csv.readBuffer(buffer);
    } else {
      await workbook.xlsx.load(buffer);
    }
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e

    // Get the specified worksheet or the first one
    const worksheet = sheetName 
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('Worksheet not found');
    }

    const data = [];
    let headers = [];

    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell((cell, colNumber) => {
        // Handle different cell value types safely
        let cellValue = cell.value;
        
        // Handle rich text objects
        if (cellValue && typeof cellValue === 'object' && cellValue.richText) {
          cellValue = cellValue.richText.map(rt => rt.text).join('');
        }
        
        // Handle hyperlinks
        if (cellValue && typeof cellValue === 'object' && cellValue.hyperlink) {
          cellValue = cellValue.text || cellValue.hyperlink;
        }
        
        // Handle formulas
        if (cellValue && typeof cellValue === 'object' && cellValue.formula) {
          cellValue = cellValue.result || cellValue.formula;
        }
        
        rowData[colNumber - 1] = cellValue;
      });

      if (rowNumber === 1) {
        // First row contains headers
        headers = rowData.filter(header => header !== null && header !== undefined && header !== '');
      } else {
        // Data rows
        if (rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
          const rowObject = {};
          headers.forEach((header, index) => {
            const value = rowData[index];
            rowObject[header] = value !== null && value !== undefined ? value : '';
          });
          data.push(rowObject);
        }
      }
    });

    return data;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
}

/**
 * Create Excel file buffer from JSON data
 * @param {Array} data - Array of objects to export
 * @param {string} sheetName - Name of the worksheet
 * @param {Object} options - Additional options for styling
 * @returns {Promise<Buffer>} - Excel file buffer
 */
async function createExcelBuffer(data, sheetName = 'Sheet1', options = {}) {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Get column headers from the first object
    const headers = Object.keys(data[0]);
    
    // Add header row with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    data.forEach(item => {
      const row = worksheet.addRow(Object.values(item));
      // Add borders to data cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50); // Max width of 50
    });

    // Generate and return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('Error creating Excel file:', error);
    throw new Error(`Failed to create Excel file: ${error.message}`);
  }
}

/**
 * Validate Excel file buffer
 * @param {Buffer} buffer - The file buffer to validate
 * @param {number} maxSize - Maximum file size in bytes (default: 5MB)
 * @returns {Object} - Validation result
 */
function validateExcelBuffer(buffer, maxSize = 5 * 1024 * 1024) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, message: 'Invalid file buffer' };
  }

  if (buffer.length === 0) {
    return { valid: false, message: 'File is empty' };
  }

  if (buffer.length > maxSize) {
    return { valid: false, message: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit` };
  }

  // Check for Excel file signatures
  const xlsxSignature = [0x50, 0x4B]; // PK (ZIP signature for .xlsx)
  const xlsSignature = [0xD0, 0xCF, 0x11, 0xE0]; // OLE signature for .xls
  
  const hasXlsxSignature = buffer[0] === xlsxSignature[0] && buffer[1] === xlsxSignature[1];
  const hasXlsSignature = buffer[0] === xlsSignature[0] && buffer[1] === xlsSignature[1] && 
                         buffer[2] === xlsSignature[2] && buffer[3] === xlsSignature[3];
  
  if (!hasXlsxSignature && !hasXlsSignature) {
    return { valid: false, message: 'File does not appear to be a valid Excel file' };
  }

  return { valid: true, message: 'File is valid' };
}

/**
 * Sanitize data for Excel export
 * @param {Array} data - Array of objects to sanitize
 * @returns {Array} - Sanitized data
 */
function sanitizeDataForExport(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(item => {
    const sanitizedItem = {};
    Object.keys(item).forEach(key => {
      let value = item[key];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert objects to strings (except dates)
      if (typeof value === 'object' && !(value instanceof Date)) {
        value = JSON.stringify(value);
      }
      
      // Sanitize strings to prevent formula injection
      if (typeof value === 'string') {
        // Remove potential formula prefixes
        value = value.replace(/^[=+\-@]/, "'");
        // Limit string length to prevent memory issues
        value = value.substring(0, 1000);
      }
      
      sanitizedItem[key] = value;
    });
    return sanitizedItem;
  });
}

module.exports = {
  readExcelBuffer,
  createExcelBuffer,
  validateExcelBuffer,
  sanitizeDataForExport
};