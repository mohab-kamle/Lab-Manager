const express = require('express');
const router = express.Router();
const db = require('../models');
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

// GET all diseases
router.get('/', authenticateUser, authorizeRoles('admin', 'chemist', 'employee'), async (req, res) => {
  try {
    const diseases = await db.diseases.findAll({
      order: [['name', 'ASC']]
    });
    res.json(diseases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET disease by ID
router.get('/:id', authenticateUser, authorizeRoles('admin', 'chemist', 'employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const diseaseItem = await db.diseases.findByPk(id);
    
    if (!diseaseItem) {
      return res.status(404).json({ error: 'Disease not found' });
    }
    
    res.json(diseaseItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new disease
router.post('/', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
    try {
        const { name, details } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Check if disease with same name already exists
        const existingDisease = await db.diseases.findOne({
            where: { name: name.trim() }
        });

        if (existingDisease) {
            return res.status(400).json({ error: 'A disease with this name already exists' });
        }

        const disease = await db.diseases.create({
            name: name.trim(),
            details: details ? details.trim() : null
        });

        res.status(201).json(disease);
    } catch (error) {
        console.error('Error creating disease:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'A disease with this name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create disease' });
        }
    }
});

// Update a disease
router.put('/:id', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
    try {
        const { name, details } = req.body;
        const disease = await db.diseases.findByPk(req.params.id);

        if (!disease) {
            return res.status(404).json({ error: 'Disease not found' });
        }

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Check if another disease with same name already exists
        const existingDisease = await db.diseases.findOne({
            where: { 
                name: name.trim(),
                id: { [db.Sequelize.Op.ne]: req.params.id }
            }
        });

        if (existingDisease) {
            return res.status(400).json({ error: 'A disease with this name already exists' });
        }

        await disease.update({
            name: name.trim(),
            details: details ? details.trim() : null
        });

        res.json(disease);
    } catch (error) {
        console.error('Error updating disease:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'A disease with this name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to update disease' });
        }
    }
});

// Delete a disease
router.delete('/:id', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
    try {
        const disease = await db.diseases.findByPk(req.params.id);

        if (!disease) {
            return res.status(404).json({ error: 'Disease not found' });
        }

        // Check if disease is associated with any patients
        const associatedPatients = await db.patient_has_diseases.count({
            where: { diseases_id: req.params.id }
        });

        if (associatedPatients > 0) {
            return res.status(400).json({ 
                error: `Cannot delete disease. It is associated with ${associatedPatients} patient(s).` 
            });
        }

        await disease.destroy();
        res.json({ message: 'Disease deleted successfully' });
    } catch (error) {
        console.error('Error deleting disease:', error);
        res.status(500).json({ error: 'Failed to delete disease' });
    }
});

// Import diseases from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate the Excel file buffer
    const validation = validateExcelBuffer(req.file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    // Read Excel file using secure ExcelJS service
    const data = await readExcelBuffer(req.file.buffer);

    if (data.length === 0) {
      return res.status(400).json({ error: 'File must contain at least one data row' });
    }

    // Get the first row as reference for expected structure
    const firstRow = data[0];
    const hasNameColumn = 'Name' in firstRow || 'name' in firstRow;
    
    if (!hasNameColumn && !Object.keys(firstRow)[0]) {
      return res.status(400).json({ error: 'File must contain a Name column or have name as the first column' });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || Object.keys(row).length === 0) continue;

      try {
        // Get name from Name column or first column
        const name = row.Name || row.name || row[Object.keys(row)[0]];
        // Get details from Details column or second column
        const details = row.Details || row.details || row[Object.keys(row)[1]] || null;

        if (!name || name.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        // Check if disease already exists
        const existingDisease = await db.diseases.findOne({ 
          where: { name: name.toString().trim() } 
        });

        if (existingDisease) {
          skipped++;
          continue;
        }

        // Create new disease
        await db.diseases.create({
          name: name.toString().trim(),
          details: details ? details.toString().trim() : null
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

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
    console.error('Error importing diseases:', error);
    res.status(500).json({ error: 'Failed to import diseases' });
  }
});

module.exports = router;