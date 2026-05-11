const express = require('express');
const router = express.Router();
const { branch, lab, employee } = require('../models');
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

// Get all branches for the user
router.get('/', authenticateUser , authorizeRoles('admin', 'receptionist'), tenantContext, async (req, res) => {
    try {
        const branches = await branch.findAll({
            where: {
                lab_id: req.tenant.lab_id
            },
            order: [['name', 'ASC']]
        });
        res.json(branches);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single branch
router.get('/:id', authenticateUser, tenantContext, async (req, res) => {
    try {
        const branchData = await branch.findOne({
            where: { id: req.params.id },
            include: [{
                model: lab,
                as: 'branch_lab',
                include: [{
                    model: employee,
                    as: 'owner_employee',
                    where: { id: req.user.id }
                }]
            }]
        });
        
        if (!branchData) {
            return res.status(404).json({ error: 'Branch not found' });
        }
        res.json(branchData);
    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new branch
router.post('/', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
    try {
        const { name, lab_id, address, landline, branch_number, manager_id } = req.body;

        // Verify that the lab belongs to the user
        const labData = await lab.findOne({
            where: { id: lab_id }
        });

        if (!labData) {
            return res.status(403).json({ error: 'You do not have permission to add branches to this lab' });
        }

        const newBranch = await branch.create({
            name,
            lab_id,
            address,
            landline,
            branch_number,
            manager_id
        });

        res.status(201).json(newBranch);
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a branch
router.put('/:id', authenticateUser, tenantContext, async (req, res) => {
    try {
        const { name, lab_id, address, landline, branch_number } = req.body;

        // Verify that the branch belongs to the current manager
        const branchData = await branch.findOne({
            where: { 
                id: req.params.id,
                manager_id: req.user.id 
            }
        });

        if (!branchData) {
            return res.status(404).json({ error: 'Branch not found or you do not have permission to update it' });
        }

        // If changing lab, verify the new lab exists
        if (lab_id && lab_id !== branchData.lab_id) {
            const newLab = await lab.findOne({
                where: { id: lab_id }
            });

            if (!newLab) {
                return res.status(404).json({ error: 'Lab not found' });
            }
        }

        await branch.update(
            { 
                name, 
                lab_id, 
                address, 
                landline,
                branch_number 
            },
            { 
                where: { 
                    id: req.params.id,
                    manager_id: req.user.id 
                } 
            }
        );

        res.json({ message: 'Branch updated successfully' });
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a branch
router.delete('/:id', authenticateUser, tenantContext, async (req, res) => {
    try {
        // Verify that the branch belongs to a lab owned by the user
        const branchData = await branch.findOne({
            where: { id: req.params.id , manager_id: req.user.id}
        });

        if (!branchData) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        await branch.destroy({ where: { id: req.params.id , manager_id: req.user.id} });
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import branches from Excel/CSV
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
        const address = row['Address'] || row['address'] || null;
        const landline = row['Landline'] || row['landline'] || null;
        const branchNumber = row['Branch Number'] || row['branch_number'] || null;
        const labName = row['Lab'] || row['lab'] || null;

        if (!name || name.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        if (!labName || labName.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Lab is required`);
          continue;
        }

        // Check if branch already exists
        const existingBranch = await branch.findOne({ 
          where: { 
            name: name.toString().trim(),
            manager_id: req.user.id
          } 
        });

        if (existingBranch) {
          skipped++;
          continue;
        }

        // Find lab by name
        const labData = await lab.findOne({
          where: { 
            name: labName.toString().trim(),
            owner_id: req.user.id
          }
        });

        if (!labData) {
          errors.push(`Row ${i + 2}: Lab "${labName}" not found or you don't have permission`);
          continue;
        }

        // Create new branch
        await branch.create({
          name: name.toString().trim(),
          address: address ? address.toString().trim() : null,
          landline: landline ? landline.toString().trim() : null,
          branch_number: branchNumber ? branchNumber.toString().trim() : null,
          lab_id: labData.id,
          manager_id: req.user.id
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
    console.error('Error importing branches:', error);
    res.status(500).json({ error: 'Failed to import branches' });
  }
});

module.exports = router;