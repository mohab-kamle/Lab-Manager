const express = require('express');
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { categories_test_and_culture  }= require('../models');
const { sign } = require('jsonwebtoken');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const multer = require('multer');
const { readExcelBuffer, validateExcelBuffer, sanitizeDataForExport } = require('../services/excelService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'), false);
    }
  }
});

router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
    try {
      const categoriesList = await categories_test_and_culture.findAll();
      res.json(categoriesList || []);
    } catch (error) {
      console.error(error);
      // Return empty array on error to prevent frontend crashes
      res.json([]);
    }
  });

// Create a new category
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const category = await categories_test_and_culture.create({ name });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
router.put('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    const category = await categories_test_and_culture.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    category.name = name || category.name;
    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const category = await categories_test_and_culture.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Import categories from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read Excel file using secure ExcelJS service
    const data = await readExcelBuffer(req.file.buffer, req.file.mimetype);
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in the file' });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || Object.keys(row).length === 0) continue;

      try {
        const name = row['Name'] || row['name'] || row[Object.keys(row)[0]];

        if (!name || name.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        // Check if category already exists
        const existingCategory = await categories_test_and_culture.findOne({ 
          where: { name: name.toString().trim() } 
        });

        if (existingCategory) {
          skipped++;
          continue;
        }

        // Create new category
        await categories_test_and_culture.create({
          name: name.toString().trim()
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    let message = `Import completed: ${imported} new categories added.`;
    if (skipped > 0) message += ` ${skipped} already existed.`;
    if (errors.length > 0) message += ` ${errors.length} errors occurred.`;

    res.json({ 
      success: true,
      summary: {
        imported,
        duplicates: skipped,
        errors: errors.length,
        total: data.length
      },
      errorDetails: errors,
      message: `Import completed: ${imported} imported, ${skipped} duplicates skipped${errors.length > 0 ? `, ${errors.length} errors` : ''}.`
    });
  } catch (error) {
    console.error('Error importing categories:', error);
    res.status(500).json({ error: 'Failed to import categories' });
  }
});

module.exports = router;