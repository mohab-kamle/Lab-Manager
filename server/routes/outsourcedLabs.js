const express = require('express');
const router = express.Router();
const { outsourced_lab } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');

const multer = require('multer');
const { readExcelBuffer, validateExcelBuffer } = require('../services/excelService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});


// All routes require authentication and tenant context
router.use(authenticateUser);
router.use(authorizeRoles('admin', 'employee', 'chemist'));
router.use(tenantContext);

// 1. GET / - Fetch all outsourced labs for the current tenant
router.get('/', async (req, res) => {
  try {
    const labs = await outsourced_lab.findAll({
      where: { lab_id: req.tenant.lab_id },
      order: [['name', 'ASC']]
    });
    res.json(labs);
  } catch (error) {
    console.error('Error fetching outsourced labs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. POST / - Create a new outsourced lab
router.post('/', async (req, res) => {
  try {
    const { name, contact_number, email, address } = req.body;
    const lab_id = req.tenant.lab_id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check for duplicate name within the same lab_id
    const existingLab = await outsourced_lab.findOne({
      where: { name: name.trim(), lab_id }
    });

    if (existingLab) {
      return res.status(400).json({ error: 'An outsourced lab with this name already exists' });
    }

    const newLab = await outsourced_lab.create({
      name: name.trim(),
      contact_number,
      email,
      address,
      lab_id
    });

    res.status(201).json(newLab);
  } catch (error) {
    console.error('Error creating outsourced lab:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. PUT /:id - Update an existing outsourced lab
router.put('/:id', async (req, res) => {
  try {
    const { name, contact_number, email, address } = req.body;
    const { id } = req.params;
    const lab_id = req.tenant.lab_id;

    const labRecord = await outsourced_lab.findOne({
      where: { id, lab_id }
    });

    if (!labRecord) {
      return res.status(404).json({ error: 'Outsourced lab not found' });
    }

    if (name && name.trim() !== labRecord.name) {
      // Check for duplicate name
      const existingLab = await outsourced_lab.findOne({
        where: { name: name.trim(), lab_id }
      });

      if (existingLab) {
        return res.status(400).json({ error: 'An outsourced lab with this name already exists' });
      }
    }

    await outsourced_lab.update(
      {
        name: name ? name.trim() : labRecord.name,
        contact_number,
        email,
        address
      },
      { where: { id, lab_id } }
    );

    res.json({ message: 'Outsourced lab updated successfully' });
  } catch (error) {
    console.error('Error updating outsourced lab:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. DELETE /:id - Delete an outsourced lab by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lab_id = req.tenant.lab_id;

    const labRecord = await outsourced_lab.findOne({
      where: { id, lab_id }
    });

    if (!labRecord) {
      return res.status(404).json({ error: 'Outsourced lab not found' });
    }

    await outsourced_lab.destroy({
      where: { id, lab_id }
    });

    res.json({ message: 'Outsourced lab deleted successfully' });
  } catch (error) {
    console.error('Error deleting outsourced lab:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. POST /import - Bulk-import outsourced labs from Excel file
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file
    const validation = validateExcelBuffer(req.file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    // Read Excel data
    const data = await readExcelBuffer(req.file.buffer);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in the uploaded file' });
    }

    const lab_id = req.tenant.lab_id;

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row.Name || row.name;
      const contact_number = row['Contact Number'] || row.contact_number || row.contact;
      const email = row.Email || row.email;
      const address = row.Address || row.address;

      if (!name || name.toString().trim() === '') {
        errors.push(`Row ${i + 2}: Name is required`);
        continue;
      }

      // Check for duplicate name
      const existingLab = await outsourced_lab.findOne({
        where: { name: name.toString().trim(), lab_id }
      });

      if (existingLab) {
        skipped++;
        continue;
      }

      try {
        await outsourced_lab.create({
          name: name.toString().trim(),
          contact_number: contact_number ? contact_number.toString() : null,
          email: email ? email.toString() : null,
          address: address ? address.toString() : null,
          lab_id
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err.message}`);
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
    console.error('Error importing outsourced labs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
