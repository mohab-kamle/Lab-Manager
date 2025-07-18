const express = require('express');
const router = express.Router();
const { antibiotic } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
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

// GET all antibiotics
router.get("/", authenticateUser, authorizeRoles("admin", "chemist", "employee"), async (req, res) => {
  try {
    const antibioticsList = await antibiotic.findAll({
      order: [['name', 'ASC']]
    });
    res.json(antibioticsList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST - Create new antibiotic
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, shortcut, commercial_name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if name already exists
    const existingAntibiotic = await antibiotic.findOne({ where: { name: name.trim() } });
    if (existingAntibiotic) {
      return res.status(400).json({ error: 'Antibiotic with this name already exists' });
    }

    // Check if shortcut already exists (if provided)
    if (shortcut && shortcut.trim() !== '') {
      const existingShortcut = await antibiotic.findOne({ where: { shortcut: shortcut.trim() } });
      if (existingShortcut) {
        return res.status(400).json({ error: 'Antibiotic with this shortcut already exists' });
      }
    }

    // Check if commercial name already exists (if provided)
    if (commercial_name && commercial_name.trim() !== '') {
      const existingCommercialName = await antibiotic.findOne({ where: { commercial_name: commercial_name.trim() } });
      if (existingCommercialName) {
        return res.status(400).json({ error: 'Antibiotic with this commercial name already exists' });
      }
    }

    const newAntibiotic = await antibiotic.create({
      name: name.trim(),
      shortcut: shortcut ? shortcut.trim() : null,
      commercial_name: commercial_name ? commercial_name.trim() : null
    });

    res.status(201).json(newAntibiotic);
  } catch (error) {
    console.error('Error creating antibiotic:', error);
    res.status(500).json({ error: 'Failed to create antibiotic' });
  }
});

// PUT - Update antibiotic
router.put('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortcut, commercial_name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const antibioticToUpdate = await antibiotic.findByPk(id);
    if (!antibioticToUpdate) {
      return res.status(404).json({ error: 'Antibiotic not found' });
    }

    // Check if name already exists (excluding current antibiotic)
    const existingAntibiotic = await antibiotic.findOne({ 
      where: { 
        name: name.trim(),
        id: { [require('sequelize').Op.ne]: id }
      } 
    });
    if (existingAntibiotic) {
      return res.status(400).json({ error: 'Antibiotic with this name already exists' });
    }

    // Check if shortcut already exists (excluding current antibiotic)
    if (shortcut && shortcut.trim() !== '') {
      const existingShortcut = await antibiotic.findOne({ 
        where: { 
          shortcut: shortcut.trim(),
          id: { [require('sequelize').Op.ne]: id }
        } 
      });
      if (existingShortcut) {
        return res.status(400).json({ error: 'Antibiotic with this shortcut already exists' });
      }
    }

    // Check if commercial name already exists (excluding current antibiotic)
    if (commercial_name && commercial_name.trim() !== '') {
      const existingCommercialName = await antibiotic.findOne({ 
        where: { 
          commercial_name: commercial_name.trim(),
          id: { [require('sequelize').Op.ne]: id }
        } 
      });
      if (existingCommercialName) {
        return res.status(400).json({ error: 'Antibiotic with this commercial name already exists' });
      }
    }

    await antibioticToUpdate.update({
      name: name.trim(),
      shortcut: shortcut ? shortcut.trim() : null,
      commercial_name: commercial_name ? commercial_name.trim() : null
    });

    res.json(antibioticToUpdate);
  } catch (error) {
    console.error('Error updating antibiotic:', error);
    res.status(500).json({ error: 'Failed to update antibiotic' });
  }
});

// DELETE - Delete antibiotic
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const antibioticToDelete = await antibiotic.findByPk(id);
    if (!antibioticToDelete) {
      return res.status(404).json({ error: 'Antibiotic not found' });
    }

    await antibioticToDelete.destroy();
    res.json({ message: 'Antibiotic deleted successfully' });
  } catch (error) {
    console.error('Error deleting antibiotic:', error);
    res.status(500).json({ error: 'Failed to delete antibiotic' });
  }
});

// Import antibiotics from Excel/CSV
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
        const shortcut = row[headers.indexOf('Shortcut')] || row[1] || null;
        const commercial_name = row[headers.indexOf('Commercial Name')] || row[2] || null;

        if (!name || name.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        // Check if antibiotic already exists
        const existingAntibiotic = await antibiotic.findOne({ 
          where: { name: name.toString().trim() } 
        });

        if (existingAntibiotic) {
          errors.push(`Row ${i + 2}: Antibiotic "${name}" already exists`);
          continue;
        }

        // Create new antibiotic
        await antibiotic.create({
          name: name.toString().trim(),
          shortcut: shortcut ? shortcut.toString().trim() : null,
          commercial_name: commercial_name ? commercial_name.toString().trim() : null
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    res.json({ 
      imported, 
      errors,
      message: `Successfully imported ${imported} antibiotics${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error importing antibiotics:', error);
    res.status(500).json({ error: 'Failed to import antibiotics' });
  }
});

module.exports = router;
