const express = require("express");
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { culture, sequelize, Sequelize, sample_type, categories_test_and_culture } = require("../models");
const { sign } = require("jsonwebtoken");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const multer = require('multer');
const XLSX = require('xlsx');

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

// GET all cultures with sample type and category info
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    const query = `
        SELECT c.id, c.name, c.price, c.sample_type_id, c.category_id,
               s.type as sample_type_name, ct.name as category_name
        FROM culture c 
        LEFT JOIN sample_type s ON c.sample_type_id = s.id
        LEFT JOIN categories_test_and_culture ct ON c.category_id = ct.id
        ORDER BY c.name;
    `;
    const cultureList = await sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });
    res.json(cultureList || []);
  } catch (error) {
    console.error(error);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// GET sample types for dropdown
router.get("/sample-types", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    const sampleTypes = await sample_type.findAll({
      attributes: ['id', 'type'],
      order: [['type', 'ASC']]
    });
    res.json(sampleTypes);
  } catch (error) {
    console.error('Error fetching sample types:', error);
    res.status(500).json({ error: 'Failed to fetch sample types' });
  }
});

// GET categories for dropdown
router.get("/categories", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    const categories = await categories_test_and_culture.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST - Create new culture
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, price, sample_type_id, category_id } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Check if name already exists
    const existingCulture = await culture.findOne({ where: { name: name.trim() } });
    if (existingCulture) {
      return res.status(400).json({ error: 'Culture with this name already exists' });
    }

    // Validate category exists
    const category = await categories_test_and_culture.findByPk(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist' });
    }

    // Validate sample type exists if provided
    if (sample_type_id) {
      const sampleType = await sample_type.findByPk(sample_type_id);
      if (!sampleType) {
        return res.status(400).json({ error: 'Selected sample type does not exist' });
      }
    }

    const newCulture = await culture.create({
      name: name.trim(),
      price: price ? parseFloat(price) : 0.00, // Default to 0 if no price provided
      sample_type_id: sample_type_id || null,
      category_id: parseInt(category_id)
    });

    res.status(201).json(newCulture);
  } catch (error) {
    console.error('Error creating culture:', error);
    res.status(500).json({ error: 'Failed to create culture' });
  }
});

// PUT - Update culture
router.put('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, sample_type_id, category_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const cultureToUpdate = await culture.findByPk(id);
    if (!cultureToUpdate) {
      return res.status(404).json({ error: 'Culture not found' });
    }

    // Check if name already exists (excluding current culture)
    const existingCulture = await culture.findOne({ 
      where: { 
        name: name.trim(),
        id: { [Sequelize.Op.ne]: id }
      } 
    });
    if (existingCulture) {
      return res.status(400).json({ error: 'Culture with this name already exists' });
    }

    // Validate category exists
    const category = await categories_test_and_culture.findByPk(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist' });
    }

    // Validate sample type exists if provided
    if (sample_type_id) {
      const sampleType = await sample_type.findByPk(sample_type_id);
      if (!sampleType) {
        return res.status(400).json({ error: 'Selected sample type does not exist' });
      }
    }

    await cultureToUpdate.update({
      name: name.trim(),
      price: price ? parseFloat(price) : 0.00, // Default to 0 if no price provided
      sample_type_id: sample_type_id || null,
      category_id: parseInt(category_id)
    });

    res.json(cultureToUpdate);
  } catch (error) {
    console.error('Error updating culture:', error);
    res.status(500).json({ error: 'Failed to update culture' });
  }
});

// DELETE - Delete culture
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const cultureToDelete = await culture.findByPk(id);
    if (!cultureToDelete) {
      return res.status(404).json({ error: 'Culture not found' });
    }

    await cultureToDelete.destroy();
    res.json({ message: 'Culture deleted successfully' });
  } catch (error) {
    console.error('Error deleting culture:', error);
    res.status(500).json({ error: 'Failed to delete culture' });
  }
});

// Import cultures from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      return res.status(400).json({ error: 'File must contain at least a header row and one data row' });
    }

    const headers = data[0];
    const rows = data.slice(1);

    let imported = 0;
    let errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      try {
        const name = row[headers.indexOf('Name')] || row[0];
        const price = row[headers.indexOf('Price')] || row[1] || null;
        const sampleTypeName = row[headers.indexOf('Sample Type')] || row[2] || null;
        const categoryName = row[headers.indexOf('Category')] || row[3];

        if (!name || name.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        if (!categoryName || categoryName.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Category is required`);
          continue;
        }

        // Check if culture already exists
        const existingCulture = await culture.findOne({ 
          where: { name: name.toString().trim() } 
        });

        if (existingCulture) {
          errors.push(`Row ${i + 2}: Culture "${name}" already exists`);
          continue;
        }

        // Find category by name
        const category = await categories_test_and_culture.findOne({
          where: { name: categoryName.toString().trim() }
        });

        if (!category) {
          errors.push(`Row ${i + 2}: Category "${categoryName}" not found`);
          continue;
        }

        // Find sample type by name if provided
        let sampleTypeId = null;
        if (sampleTypeName && sampleTypeName.toString().trim() !== '') {
          const sampleType = await sample_type.findOne({
            where: { type: sampleTypeName.toString().trim() }
          });
          if (!sampleType) {
            errors.push(`Row ${i + 2}: Sample type "${sampleTypeName}" not found`);
            continue;
          }
          sampleTypeId = sampleType.id;
        }

        // Create new culture
        await culture.create({
          name: name.toString().trim(),
          price: price ? parseFloat(price) : null,
          sample_type_id: sampleTypeId,
          category_id: category.id
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    res.json({ 
      imported, 
      errors,
      message: `Successfully imported ${imported} cultures${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error importing cultures:', error);
    res.status(500).json({ error: 'Failed to import cultures' });
  }
});

module.exports = router;
