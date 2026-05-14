const express = require('express');
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { sample_type, lab_sample_type_settings, db } = require('../models');
const { Op } = require('sequelize');
const { sign } = require('jsonwebtoken');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');
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
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), tenantContext, async (req, res) => {
    try {
      const samplesList = await sample_type.findAll({
        where: {
          [Op.or]: [
            { lab_id: null },
            { lab_id: req.tenant.lab_id }
          ]
        },
        include: [{
          model: lab_sample_type_settings,
          as: 'lab_settings',
          where: { lab_id: req.tenant.lab_id },
          required: false
        }]
      });

      // Merge global defaults with lab-specific settings
      const mergedSamples = samplesList.map(sample => {
        const plainSample = sample.get({ plain: true });
        const labSettings = plainSample.lab_settings && plainSample.lab_settings[0];
        
        return {
          ...plainSample,
          tube_color: labSettings ? labSettings.tube_color : plainSample.tube_color,
          container_type: labSettings ? labSettings.container_type : plainSample.container_type,
          is_custom: !!labSettings,
          is_lab_specific: plainSample.lab_id !== null
        };
      });

      res.json(mergedSamples);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

// POST - Create new sample type
router.post("/", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
  try {
    const { name, tube_color, container_type } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Name is required" });
    }

    const existingSample = await sample_type.findOne({ 
      where: { 
        type: name.trim(),
        [Op.or]: [{ lab_id: null }, { lab_id: req.tenant.lab_id }]
      } 
    });
    if (existingSample) {
      return res.status(400).json({ error: "Sample type with this name already exists for your lab" });
    }

    const newSample = await sample_type.create({
      type: name.trim(),
      tube_color,
      container_type,
      lab_id: req.tenant.lab_id
    });

    res.status(201).json(newSample);
  } catch (error) {
    console.error("Error creating sample type:", error);
    res.status(500).json({ error: "Failed to create sample type" });
  }
});

// PUT - Update sample type
router.put("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tube_color, container_type } = req.body;

    const sample = await sample_type.findByPk(id);
    if (!sample) {
      return res.status(404).json({ error: "Sample type not found" });
    }

    // Permission check: only allow updating if it's their own or it's a global one (via settings)
    if (sample.lab_id !== null && sample.lab_id !== req.tenant.lab_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (sample.lab_id === req.tenant.lab_id) {
      // It's a lab-specific sample type, update directly
      if (name) {
        // Check for duplicates in lab space or global space
        const existingSample = await sample_type.findOne({ 
          where: { 
            type: name.trim(),
            id: { [Op.ne]: id },
            [Op.or]: [{ lab_id: null }, { lab_id: req.tenant.lab_id }]
          } 
        });
        if (existingSample) {
          return res.status(400).json({ error: "Sample type with this name already exists" });
        }
        sample.type = name.trim();
      }
      if (tube_color !== undefined) sample.tube_color = tube_color;
      if (container_type !== undefined) sample.container_type = container_type;
      await sample.save();
    } else {
      // It's a global sample type, use override table
      await lab_sample_type_settings.upsert({
        lab_id: req.tenant.lab_id,
        sample_type_id: id,
        tube_color: tube_color,
        container_type: container_type
      });
    }

    res.json({ message: "Sample type updated successfully" });
  } catch (error) {
    console.error("Error updating sample type:", error);
    res.status(500).json({ error: "Failed to update sample type" });
  }
});

// DELETE - Delete sample type
router.delete("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
  try {
    const { id } = req.params;

    const sample = await sample_type.findByPk(id);
    if (!sample) {
      return res.status(404).json({ error: "Sample type not found" });
    }

    // Only allow deleting lab-specific types
    if (sample.lab_id === null) {
      return res.status(403).json({ error: "Cannot delete global sample types. You can only customize them." });
    }

    if (sample.lab_id !== req.tenant.lab_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await sample.destroy();
    res.json({ message: "Sample type deleted successfully" });
  } catch (error) {
    console.error("Error deleting sample type:", error);
    res.status(500).json({ error: "Failed to delete sample type" });
  }
});

// Import sample types from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), tenantContext, upload.single('file'), async (req, res) => {
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
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || Object.keys(row).length === 0) continue;

      try {
        const type = row['Type'] || row['type'] || row[Object.keys(row)[0]];

        if (!type || type.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Type is required`);
          continue;
        }

        // Check if sample type already exists in lab or global space
        const existingSampleType = await sample_type.findOne({ 
          where: { 
            type: type.toString().trim(),
            [Op.or]: [{ lab_id: null }, { lab_id: req.tenant.lab_id }]
          } 
        });

        if (existingSampleType) {
          errors.push(`Row ${i + 2}: Sample type "${type}" already exists`);
          continue;
        }

        // Create new sample type specifically for this lab
        await sample_type.create({
          type: type.toString().trim(),
          lab_id: req.tenant.lab_id
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