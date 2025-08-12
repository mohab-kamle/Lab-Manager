const express = require('express');
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { sample_type  }= require('../models');
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

// GET all sample types
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
    try {
      const samplesList = await sample_type.findAll();
      res.json(samplesList);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

// POST - Create new sample type
router.post("/", authenticateUser, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Name is required" });
    }

    const existingSample = await sample_type.findOne({ where: { type: name.trim() } });
    if (existingSample) {
      return res.status(400).json({ error: "Sample type with this name already exists" });
    }

    const newSample = await sample_type.create({
      type: name.trim()
    });

    res.status(201).json(newSample);
  } catch (error) {
    console.error("Error creating sample type:", error);
    res.status(500).json({ error: "Failed to create sample type" });
  }
});

// PUT - Update sample type
router.put("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Name is required" });
    }

    const sample = await sample_type.findByPk(id);
    if (!sample) {
      return res.status(404).json({ error: "Sample type not found" });
    }

    // Check if name already exists (excluding current sample)
    const existingSample = await sample_type.findOne({ 
      where: { 
        type: name.trim(),
        id: { [require('sequelize').Op.ne]: id }
      } 
    });
    if (existingSample) {
      return res.status(400).json({ error: "Sample type with this name already exists" });
    }

    await sample.update({ type: name.trim() });
    res.json(sample);
  } catch (error) {
    console.error("Error updating sample type:", error);
    res.status(500).json({ error: "Failed to update sample type" });
  }
});

// DELETE - Delete sample type
router.delete("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const sample = await sample_type.findByPk(id);
    if (!sample) {
      return res.status(404).json({ error: "Sample type not found" });
    }

    await sample.destroy();
    res.json({ message: "Sample type deleted successfully" });
  } catch (error) {
    console.error("Error deleting sample type:", error);
    res.status(500).json({ error: "Failed to delete sample type" });
  }
});

// Import sample types from Excel/CSV
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
        const type = row[headers.indexOf('Type')] || row[0];

        if (!type || type.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Type is required`);
          continue;
        }

        // Check if sample type already exists
        const existingSampleType = await sample_type.findOne({ 
          where: { type: type.toString().trim() } 
        });

        if (existingSampleType) {
          errors.push(`Row ${i + 2}: Sample type "${type}" already exists`);
          continue;
        }

        // Create new sample type
        await sample_type.create({
          type: type.toString().trim()
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    res.json({ 
      imported, 
      errors,
      message: `Successfully imported ${imported} sample types${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error importing sample types:', error);
    res.status(500).json({ error: 'Failed to import sample types' });
  }
});

module.exports = router;