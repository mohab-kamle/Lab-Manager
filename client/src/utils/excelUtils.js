/**
 * Secure Excel utility functions using ExcelJS
 * Replaces the vulnerable xlsx package with a safer alternative
 */
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 * @param {Object} options - Additional options for styling
 */
export const exportToExcel = async (data, filename, sheetName = 'Sheet1', options = {}) => {
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length === 0) {
      throw new Error('No data to export');
    }

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

    // Generate buffer and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const currentDate = new Date().toISOString().split('T')[0];
    saveAs(blob, `${filename}_${currentDate}.xlsx`);
    
    return { success: true, message: 'File exported successfully' };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Read Excel file and convert to JSON
 * @param {File} file - The Excel file to read
 * @param {string} sheetName - Name of the worksheet to read (optional)
 * @returns {Promise<Array>} - Array of objects representing the data
 */
export const importFromExcel = async (file, sheetName = null) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

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
        rowData[colNumber - 1] = cell.value;
      });

      if (rowNumber === 1) {
        // First row contains headers
        headers = rowData.filter(header => header !== null && header !== undefined);
      } else {
        // Data rows
        if (rowData.some(cell => cell !== null && cell !== undefined)) {
          const rowObject = {};
          headers.forEach((header, index) => {
            rowObject[header] = rowData[index] || '';
          });
          data.push(rowObject);
        }
      }
    });

    return { success: true, data, message: 'File imported successfully' };
  } catch (error) {
    console.error('Error importing from Excel:', error);
    return { success: false, data: [], message: error.message };
  }
};

/**
 * Validate Excel file before processing
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result
 */
export const validateExcelFile = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];

  if (!file) {
    return { valid: false, message: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { valid: false, message: 'File size exceeds 5MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: 'Invalid file type. Please select .xlsx, .xls, or .csv file' };
  }

  return { valid: true, message: 'File is valid' };
};