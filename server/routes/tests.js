const express = require("express");
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { test, sequelize, Sequelize } = require("../models");
const { sign } = require("jsonwebtoken");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const db = require("../models");
const multer = require('multer');
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
const { readExcelBuffer, validateExcelBuffer, sanitizeDataForExport } = require('../services/excelService');
const fs = require('fs');

// Add CORS debugging for tests route
router.use((req, res, next) => {
  console.log(`Tests Route: ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

/**
 * Converts the frontend component array into the structure_config JSON format
 * that is stored in the database and consumed by DynamicResultForm.
 * 
 * Each component can carry a full reference_ranges array with multiple
 * demographic-specific entries (gender, age_min, age_max, min, max, panic_min, panic_max).
 * This enables a single "WBC" component to have separate normal ranges for
 * males vs females, adults vs children, etc.
 */
function buildStructureConfig(components) {
  const structureConfig = [];
  let idCounter = 1;

  for (const component of components) {
    // Determine the internal type key used by DynamicResultForm
    let type = 'numeric';
    if (component.result_type === 'boolean') type = 'boolean';
    else if (component.result_type === 'culture_panel') type = 'culture_panel';

    // If the frontend already sends a reference_ranges array, use it directly.
    // Otherwise, fall back to the legacy flat fields for backward compatibility.
    let referenceRanges = [];
    if (Array.isArray(component.reference_ranges) && component.reference_ranges.length > 0) {
      referenceRanges = component.reference_ranges.map(r => ({
        gender: r.gender || null,
        age_min: r.age_min != null && r.age_min !== '' ? parseInt(r.age_min) : null,
        age_max: r.age_max != null && r.age_max !== '' ? parseInt(r.age_max) : null,
        min: r.min != null && r.min !== '' ? parseFloat(r.min) : null,
        max: r.max != null && r.max !== '' ? parseFloat(r.max) : null,
        panic_min: r.panic_min != null && r.panic_min !== '' ? parseFloat(r.panic_min) : null,
        panic_max: r.panic_max != null && r.panic_max !== '' ? parseFloat(r.panic_max) : null,
      }));
    } else if (component.normal_from !== undefined || component.normal_to !== undefined) {
      // Legacy flat-field fallback: construct a single reference_range entry
      let genderValue = null;
      if (component.gender === 'm' || component.gender === 'Male') genderValue = 'Male';
      else if (component.gender === 'f' || component.gender === 'Female') genderValue = 'Female';

      referenceRanges = [{
        gender: genderValue,
        age_min: component.age_start ? parseInt(component.age_start) : null,
        age_max: component.age_end ? parseInt(component.age_end) : null,
        min: component.normal_from !== undefined && component.normal_from !== '' ? parseFloat(component.normal_from) : null,
        max: component.normal_to !== undefined && component.normal_to !== '' ? parseFloat(component.normal_to) : null,
        panic_min: component.c_low !== undefined && component.c_low !== '' ? parseFloat(component.c_low) : null,
        panic_max: component.c_high !== undefined && component.c_high !== '' ? parseFloat(component.c_high) : null,
      }];
    }

    structureConfig.push({
      key: `comp_${Date.now()}_${idCounter++}`,
      type,
      label: component.name,
      unit: component.unit || '',
      reference_ranges: referenceRanges,
      reference_range: component.reference_range || null,
    });
  }

  return structureConfig;
}

router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), tenantContext, async (req, res) => {
  try {
    const lab_id = req.tenant.lab_id;
    console.log('Tests route accessed by user:', req.user.id, 'for lab:', lab_id);

    const testsList = await db.test.findAll({
      where: { lab_id },
      include: [
        {
          model: db.categories_test_and_culture,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: db.sample_type,
          as: 'sample_type',
          attributes: ['id', 'type', 'tube_color', 'container_type', 'standard_code'],
          include: [{
            model: db.lab_sample_type_settings,
            as: 'lab_settings',
            where: { lab_id },
            required: false
          }]
        }
      ]
    });

    // Merge lab-specific settings into sample_type
    const mappedTestsList = testsList.map(t => {
      const testJson = t.toJSON();
      if (testJson.sample_type) {
        const settings = testJson.sample_type.lab_settings && testJson.sample_type.lab_settings[0];
        if (settings) {
          testJson.sample_type.tube_color = settings.tube_color || testJson.sample_type.tube_color;
          testJson.sample_type.container_type = settings.container_type || testJson.sample_type.container_type;
        }
        delete testJson.sample_type.lab_settings;
      }
      return testJson;
    });

    console.log(`Found ${mappedTestsList.length} tests`);
    res.json(mappedTestsList || []);
  } catch (error) {
    console.error('Error in tests route:', error);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// Create a new test
router.post('/', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      name,
      shortcut,
      price,
      cost,
      lab_to_lab_status,
      lab_name,
      category_id,
      precautions,
      decreased_in,
      increased_in,
      contract_id,
      global_test_id,
      structure_config,
      type,
      tat_hours
    } = req.body;
    let { sample_type_id } = req.body;
    const lab_id = req.tenant.lab_id;

    if (!name) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Name is required' });
    }

    // The Automation Magic: If they selected a global test, auto-fetch the sample type
    if (global_test_id && !sample_type_id) {
      const globalTest = await db.global_test_catalog.findByPk(global_test_id, { transaction });
      if (globalTest && globalTest.default_sample_type_id) {
        sample_type_id = globalTest.default_sample_type_id;
      }
    }

    // Check if test with same name already exists in THIS lab
    const existingTest = await db.test.findOne({ 
      where: { name, lab_id },
      transaction 
    });
    if (existingTest) {
      await transaction.rollback();
      return res.status(400).json({ error: `A test with the name "${name}" already exists in your lab` });
    }

    // Check if shortcut already exists in THIS lab (only for non-empty shortcuts)
    if (shortcut && shortcut.trim()) {
      const existingShortcut = await db.test.findOne({ 
        where: { shortcut, lab_id },
        transaction 
      });
      if (existingShortcut) {
        await transaction.rollback();
        return res.status(400).json({ error: `A test with the shortcut "${shortcut}" already exists in your lab` });
      }
    }

    // Normalize and validate Lab-to-Lab fields
    const normalizedStatus = (lab_to_lab_status && lab_to_lab_status.trim()) ? lab_to_lab_status.trim().toUpperCase() : null;
    const normalizedLabName = (lab_name && lab_name.trim()) ? lab_name.trim() : null;

    if (normalizedStatus === 'OUT' && !normalizedLabName) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Lab Name is required when Lab-to-Lab status is set to "Out"' });
    }

    const test = await db.test.create({
      lab_id,
      name,
      shortcut: shortcut || null,
      price: price || 0.00,
      cost,
      lab_to_lab_status: normalizedStatus,
      lab_name: normalizedLabName,
      category_id,
      precautions,
      decreased_in,
      increased_in,
      sample_type_id,
      contract_id,
      global_test_id,
      structure_config,
      type: type || 'single',
      tat_hours
    }, { transaction });

    await transaction.commit();
    res.status(201).json(test);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error creating test:', error);

    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = Object.keys(error.fields)[0];
      return res.status(400).json({ error: `A test with this ${field} already exists in your lab` });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors[0].message });
    }

    res.status(500).json({ error: 'Failed to create test', details: error.message });
  }
});

// Bulk Delete tests
router.post('/bulk-delete', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  try {
    const { testIds } = req.body;
    const lab_id = req.tenant.lab_id;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ error: 'No valid test IDs provided' });
    }

    const deletedCount = await db.test.destroy({
      where: {
        id: testIds,
        lab_id
      }
    });

    res.json({ message: `Successfully deleted ${deletedCount} tests`, deletedCount });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: 'Failed to delete tests in bulk' });
  }
});

// Update a test
router.put('/:id', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      name,
      shortcut,
      price,
      cost,
      lab_to_lab_status,
      lab_name,
      category_id,
      precautions,
      decreased_in,
      increased_in,
      sample_type_id,
      contract_id,
      global_test_id,
      structure_config,
      type,
      tat_hours
    } = req.body;

    const test = await db.test.findOne({ 
      where: { id: req.params.id, lab_id: req.tenant.lab_id },
      transaction 
    });
    if (!test) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Test not found' });
    }

    // Check for name collision if name is being changed
    if (name && name !== test.name) {
      const nameExists = await db.test.findOne({ 
        where: { name, lab_id: req.tenant.lab_id, id: { [db.Sequelize.Op.ne]: test.id } },
        transaction 
      });
      if (nameExists) {
        await transaction.rollback();
        return res.status(400).json({ error: `A test with the name "${name}" already exists in your lab` });
      }
    }

    // Check for shortcut collision if shortcut is being changed
    if (shortcut && (shortcut || null) !== test.shortcut) {
      const shortcutExists = await db.test.findOne({ 
        where: { shortcut, lab_id: req.tenant.lab_id, id: { [db.Sequelize.Op.ne]: test.id } },
        transaction 
      });
      if (shortcutExists) {
        await transaction.rollback();
        return res.status(400).json({ error: `A test with the shortcut "${shortcut}" already exists in your lab` });
      }
    }

    // Update fields, allowing empty strings for text fields
    test.name = name !== undefined ? name : test.name;
    test.shortcut = shortcut !== undefined ? (shortcut || null) : test.shortcut; // Convert empty string to null
    test.price = price !== undefined ? price : test.price;
    test.cost = cost !== undefined ? cost : test.cost;
    
    // Normalize and validate Lab-to-Lab fields for update
    if (lab_to_lab_status !== undefined) {
      test.lab_to_lab_status = (lab_to_lab_status && lab_to_lab_status.trim()) ? lab_to_lab_status.trim().toUpperCase() : null;
    }
    
    if (lab_name !== undefined) {
      test.lab_name = (lab_name && lab_name.trim()) ? lab_name.trim() : null;
    }

    if (test.lab_to_lab_status === 'OUT' && !test.lab_name) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Lab Name is required when Lab-to-Lab status is set to "Out"' });
    }
    test.category_id = category_id !== undefined ? category_id : test.category_id;
    test.precautions = precautions !== undefined ? precautions : test.precautions;
    test.decreased_in = decreased_in !== undefined ? decreased_in : test.decreased_in;
    test.increased_in = increased_in !== undefined ? increased_in : test.increased_in;
    test.sample_type_id = sample_type_id !== undefined ? sample_type_id : test.sample_type_id;
    test.contract_id = contract_id !== undefined ? contract_id : test.contract_id;
    test.global_test_id = global_test_id !== undefined ? global_test_id : test.global_test_id;
    test.structure_config = structure_config !== undefined ? structure_config : test.structure_config;
    test.type = type !== undefined ? type : test.type;
    test.tat_hours = tat_hours !== undefined ? tat_hours : test.tat_hours;

    await test.save({ transaction });
    await transaction.commit();
    res.json(test);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error updating test:', error);

    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = Object.keys(error.fields)[0];
      return res.status(400).json({ error: `A test with this ${field} already exists in your lab` });
    }

    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Delete a test
router.delete('/:id', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  try {
    const testInstance = await db.test.findOne({ where: { id: req.params.id, lab_id: req.tenant.lab_id } });
    if (!testInstance) return res.status(404).json({ error: 'Test not found' });

    console.log(`Deleting test ${req.params.id} and all associated data...`);

    // Delete all associated data in the correct order to avoid foreign key constraint errors
    let deletedComponents = 0;
    let deletedBillTests = 0;
    let deletedContractTests = 0;
    let deletedMedicalReportTests = 0;
    let deletedPaoTests = 0;
    let deletedQuestionTests = 0;



    try {
      // 2. Delete bill_has_test relationships
      deletedBillTests = await db.bill_has_test.destroy({
        where: { test_id: req.params.id }
      });
      console.log(`Deleted ${deletedBillTests} bill-test relationships`);
    } catch (error) {
      console.log(`Error deleting bill-test relationships: ${error.message}`);
    }

    try {
      // 3. Delete contract_has_test relationships
      deletedContractTests = await db.contract_has_test.destroy({
        where: { test_id: req.params.id }
      });
      console.log(`Deleted ${deletedContractTests} contract-test relationships`);
    } catch (error) {
      console.log(`Error deleting contract-test relationships: ${error.message}`);
    }

    try {
      // 4. Delete medical_report_has_test relationships
      deletedMedicalReportTests = await db.medical_report_has_test.destroy({
        where: { test_id: req.params.id }
      });
      console.log(`Deleted ${deletedMedicalReportTests} medical report-test relationships`);
    } catch (error) {
      console.log(`Error deleting medical report-test relationships: ${error.message}`);
    }

    try {
      // 5. Delete pao_has_test relationships (packages and offers)
      deletedPaoTests = await db.pao_has_test.destroy({
        where: { test_id: req.params.id }
      });
      console.log(`Deleted ${deletedPaoTests} package-test relationships`);
    } catch (error) {
      console.log(`Error deleting package-test relationships: ${error.message}`);
    }

    try {
      // 6. Delete question-test relationships
      deletedQuestionTests = await db.test_has_question.destroy({
        where: { test_id: req.params.id }
      });
      console.log(`Deleted ${deletedQuestionTests} question-test relationships`);
    } catch (error) {
      console.log(`Error deleting question-test relationships: ${error.message}`);
    }

    // Finally, delete the test itself
    await testInstance.destroy();
    console.log(`Successfully deleted test ${req.params.id}`);

    res.json({
      message: 'Test deleted successfully',
      deletedData: {
        components: deletedComponents,
        billTests: deletedBillTests,
        contractTests: deletedContractTests,
        medicalReportTests: deletedMedicalReportTests,
        paoTests: deletedPaoTests,
        questionTests: deletedQuestionTests
      }
    });
  } catch (error) {
    console.error('Error deleting test:', error);

    // Handle specific foreign key constraint errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        error: 'Cannot delete test because it has associated data. Please remove all associated components and references first.',
        details: error.message
      });
    }

    res.status(500).json({ error: 'Failed to delete test', details: error.message });
  }
});

// Get test components
router.get('/:id/components', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), tenantContext, async (req, res) => {
  try {
    const test = await db.test.findOne({ where: { id: req.params.id, lab_id: req.tenant.lab_id }, attributes: ['structure_config'] });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    let mappedComponents = [];
    if (test.structure_config && Array.isArray(test.structure_config)) {
      mappedComponents = test.structure_config
        .filter(c => c.type !== 'header')
        .map(c => {
          // Return the full reference_ranges array so the frontend can display/edit all demographic-specific ranges
          const referenceRanges = Array.isArray(c.reference_ranges) ? c.reference_ranges : [];
          return {
            name: c.label || c.name || '',
            unit: c.unit || '',
            result_type: c.type === 'boolean' ? 'boolean' : c.type === 'culture_panel' ? 'culture_panel' : 'range',
            reference_range: c.reference_range || '',
            reference_ranges: referenceRanges,
          };
        });
    }

    res.json(mappedComponents);
  } catch (error) {
    console.error('Error fetching test components:', error);
    res.status(500).json({ error: 'Failed to fetch test components' });
  }
});

// Create test components
// Accepts components with nested reference_ranges array for demographic-specific normal values
router.post('/:id/components', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  try {
    const { components } = req.body;
    const testId = req.params.id;

    console.log('Creating test components for test ID:', testId);

    const test = await db.test.findOne({ where: { id: testId, lab_id: req.tenant.lab_id } });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const structureConfig = buildStructureConfig(components);

    await test.update({ structure_config: structureConfig });
    console.log('Successfully created', structureConfig.length, 'components in structure_config');
    res.status(201).json(components);
  } catch (error) {
    console.error('Error creating test components:', error);
    res.status(500).json({ error: 'Failed to create test components', details: error.message });
  }
});

// Update test components
// Accepts components with nested reference_ranges array for demographic-specific normal values
router.put('/:id/components', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  try {
    const { components } = req.body;
    const testId = req.params.id;

    console.log('Updating test components for test ID:', testId);

    const test = await db.test.findOne({ where: { id: testId, lab_id: req.tenant.lab_id } });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const structureConfig = buildStructureConfig(components);

    await test.update({ structure_config: structureConfig });
    console.log('Successfully updated', structureConfig.length, 'components in structure_config');
    res.json(components);
  } catch (error) {
    console.error('Error updating test components:', error);
    res.status(500).json({ error: 'Failed to update test components', details: error.message });
  }
});

// Optimized endpoint: get all tests with their category and sample_type
router.get('/all-with-components', authenticateUser, authorizeRoles('admin', 'receptionist', 'chemist', 'doctor', 'employee'), tenantContext, async (req, res) => {
  try {
    const tests = await db.test.findAll({
      where: { lab_id: req.tenant.lab_id },
      include: [
        {
          model: db.categories_test_and_culture,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: db.sample_type,
          as: 'sample_type',
          attributes: ['id', 'type', 'tube_color', 'container_type', 'standard_code'],
          include: [{
            model: db.lab_sample_type_settings,
            as: 'lab_settings',
            where: { lab_id: req.tenant.lab_id },
            required: false
          }]
        },
        {
          model: db.question,
          as: 'questions',
          through: { attributes: [] },
          attributes: ['id', 'text', 'category'],
          where: { is_active: true },
          required: false
        }
      ]
    });

    // Map structure_config to components for frontend compatibility
    const mappedTests = tests.map(test => {
      const testJson = test.toJSON();
      let mappedComponents = [];

      if (testJson.structure_config && Array.isArray(testJson.structure_config)) {
        mappedComponents = testJson.structure_config
          .filter(c => c.type !== 'header')
          .map(c => {
            const firstRange = (c.reference_ranges && c.reference_ranges.length > 0) ? c.reference_ranges[0] : {};
            return {
              name: c.label || c.name || '',
              unit: c.unit || '',
              normal_from: (firstRange.min !== null && firstRange.min !== undefined) ? firstRange.min : (c.normal_from !== undefined ? c.normal_from : ''),
              normal_to: (firstRange.max !== null && firstRange.max !== undefined) ? firstRange.max : (c.normal_to !== undefined ? c.normal_to : ''),
              c_low: c.c_low || '',
              c_high: c.c_high || '',
              gender: firstRange.gender === 'Male' ? 'Male' : firstRange.gender === 'Female' ? 'Female' : (c.gender || 'Any'),
              age_start: c.age_start || '',
              age_end: c.age_end || '',
              reference_range: c.reference_range || '',
              reference_ranges: Array.isArray(c.reference_ranges) ? c.reference_ranges : [],
              result_type: c.type === 'boolean' ? 'boolean' : c.type === 'culture_panel' ? 'culture_panel' : 'range',
            };
          });
      }

      if (testJson.sample_type) {
        const settings = testJson.sample_type.lab_settings && testJson.sample_type.lab_settings[0];
        if (settings) {
          testJson.sample_type.tube_color = settings.tube_color || testJson.sample_type.tube_color;
          testJson.sample_type.container_type = settings.container_type || testJson.sample_type.container_type;
        }
        delete testJson.sample_type.lab_settings;
      }

      testJson.components = mappedComponents;
      return testJson;
    });

    res.json(mappedTests);
  } catch (error) {
    console.error('Error fetching all tests with components:', error);
    res.status(500).json({ error: 'Failed to fetch tests with components' });
  }
});

// Get test count
router.get('/count', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  try {
    const count = await db.test.count({ where: { lab_id: req.tenant.lab_id } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get test count' });
  }
});

// Import tests from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), tenantContext, upload.single('file'), async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file
    const validation = validateExcelBuffer(req.file.buffer);
    if (!validation.valid) {
      await transaction.rollback();
      return res.status(400).json({ error: validation.message });
    }

    // Read Excel data
    const data = await readExcelBuffer(req.file.buffer);

    if (!data || data.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "No data found in the uploaded file" });
    }
    
    let imported = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || Object.keys(row).length === 0) continue;

      // Use nested transaction (savepoint) for row-level atomicity
      const rowTransaction = await db.sequelize.transaction({ transaction });
      try {
        const name = row.Name || row.name || row['Test Name'];
        const categoryName = row.Category || row['Category Name'] || row.category || row['Category ID'] || row.category_id;
        const sampleTypeName = row['Sample Type'] || row['Sample Type Name'] || row.sample_type || row['Sample Type ID'] || row.sample_type_id;
        const contractName = row.Contract || row['Contract Name'] || row.contract || row['Contract ID'] || row.contract_id;

        if (!name) {
          await rowTransaction.rollback();
          errors.push({ name: 'Unknown', error: `Row ${i + 2}: Test Name is required` });
          continue;
        }

        if (!categoryName) {
          await rowTransaction.rollback();
          errors.push({ name: name, error: `Row ${i + 2}: Category is required` });
          continue;
        }

        // Look up Category ID (Auto-create if not found)
        let categoryId = null;
        if (categoryName) {
          const trimmedCatName = categoryName.toString().trim();
          const [cat] = await db.categories_test_and_culture.findOrCreate({
            where: { 
              name: trimmedCatName, 
              lab_id: req.tenant.lab_id 
            },
            defaults: {
              lab_id: req.tenant.lab_id
            },
            transaction: rowTransaction
          });
          
          if (cat) {
            categoryId = cat.id;
          } else if (!isNaN(categoryName)) {
            categoryId = parseInt(categoryName);
          } else {
            await rowTransaction.rollback();
            errors.push({ name: name, error: `Row ${i + 2}: Category "${categoryName}" could not be created or found` });
            continue;
          }
        }

        // Look up Sample Type ID (Auto-create if not found)
        let sampleTypeId = null;
        if (sampleTypeName) {
          const trimmedSTName = sampleTypeName.toString().trim();
          const [st] = await db.sample_type.findOrCreate({
            where: { 
              name: trimmedSTName,
              lab_id: req.tenant.lab_id
            },
            defaults: {
              lab_id: req.tenant.lab_id
            },
            transaction: rowTransaction
          });
          sampleTypeId = st.id;
        }

        // Look up Contract ID
        let contractId = null;
        if (contractName) {
          const trimmedCTName = contractName.toString().trim();
          const ct = await db.contract.findOne({
            where: { name: trimmedCTName },
            transaction: rowTransaction
          });
          if (ct) {
            contractId = ct.id;
          } else if (!isNaN(contractName)) {
            contractId = parseInt(contractName);
          }
        }

        // Try to find by name
        let existingTest = await db.test.findOne({ 
          where: { name: name.toString().trim(), lab_id: req.tenant.lab_id },
          transaction: rowTransaction
        });
        
        // Normalize Lab-to-Lab fields
        const normalizedStatus = (row['Lab to Lab Status'] || row['lab_to_lab_status'] || row['Lab to Lab']) 
          ? (row['Lab to Lab Status'] || row['lab_to_lab_status'] || row['Lab to Lab']).toString().trim().toUpperCase() 
          : null;
        const normalizedLabName = (row['Lab Name'] || row['lab_name']) 
          ? (row['Lab Name'] || row['lab_name']).toString().trim() 
          : null;

        const testData = {
          lab_id: req.tenant.lab_id,
          name: name.toString().trim(),
          shortcut: row.Shortcut || row.shortcut || null,
          price: parseFloat(row.Price || row.price) || 0.00,
          cost: parseFloat(row.Cost || row.cost) || 0.00,
          lab_to_lab_status: normalizedStatus === 'IN' || normalizedStatus === 'OUT' ? normalizedStatus : null,
          lab_name: normalizedLabName,
          category_id: categoryId,
          precautions: row.Precautions || row.precautions || null,
          decreased_in: row['Decreased In'] || row.decreased_in || null,
          increased_in: row['Increased In'] || row.increased_in || null,
          sample_type_id: sampleTypeId,
          contract_id: contractId,
          type: row.Type || row.type || 'single',
          tat_hours: row['TAT Hours'] || row.tat_hours ? parseInt(row['TAT Hours'] || row.tat_hours) : null
        };

        if (existingTest) {
          await existingTest.update(testData, { transaction: rowTransaction });
          updated++;
        } else {
await db.test.create({
            ...testData,
            structure_config: [] 
          }, { transaction: rowTransaction });
          imported++;
        }
        await rowTransaction.commit();
      } catch (rowError) {
        await rowTransaction.rollback();
        console.error(`Row Import Error (${row.Name || 'Unknown'}):`, rowError);
        
        errors.push({ 
          name: row.Name || `Row ${i + 2}`, 
          error: rowError.name === 'SequelizeUniqueConstraintError' 
            ? 'Duplicate name or shortcut in this lab' 
            : rowError.message 
        });
      }
    }

    await transaction.commit();
    
    res.json({ 
      success: true,
      summary: {
        imported,
        updated,
        errors: errors.length,
        total: data.length
      },
      errorDetails: errors,
      message: `Import completed: ${imported} imported, ${updated} updated${errors.length > 0 ? `, ${errors.length} errors` : ''}.`
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error importing tests:', error);
    res.status(500).json({ error: 'Failed to import tests', details: error.message });
  }
});

module.exports = router;
