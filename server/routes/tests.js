const express = require("express");
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { test, sequelize, Sequelize } = require("../models");
const { sign } = require("jsonwebtoken");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const db = require("../models");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const XLSX = require('xlsx');
const fs = require('fs');

// Add CORS debugging for tests route
router.use((req, res, next) => {
  console.log(`Tests Route: ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    console.log('Tests route accessed by user:', req.user.id, 'with role:', req.user.role);
    
    const testsList = await db.test.findAll({
      include: [
        {
          model: db.categories_test_and_culture,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: db.sample_type,
          as: 'sample_type',
          attributes: ['id', 'type']
        }
      ]
    });
    
    console.log(`Found ${testsList.length} tests`);
    res.json(testsList || []);
  } catch (error) {
    console.error('Error in tests route:', error);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// Create a new test
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
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
      contract_id 
    } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    // Check if test with same name already exists
    const existingTest = await db.test.findOne({ where: { name } });
    if (existingTest) {
      return res.status(400).json({ error: `A test with the name "${name}" already exists` });
    }
    
    // Check if shortcut already exists (only for non-empty shortcuts)
    if (shortcut && shortcut.trim()) {
      const existingShortcut = await db.test.findOne({ where: { shortcut } });
      if (existingShortcut) {
        return res.status(400).json({ error: `A test with the shortcut "${shortcut}" already exists` });
      }
    }
    
    const test = await db.test.create({ 
      name, 
      shortcut: shortcut || null, // Convert empty string to null
      price: price || 0.00, // Default to 0 if no price provided
      cost,
      lab_to_lab_status,
      lab_name,
      category_id, 
      precautions, 
      decreased_in, 
      increased_in, 
      sample_type_id,
      contract_id 
    });
    res.status(201).json(test);
  } catch (error) {
    console.error('Error creating test:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.fields && error.fields.name) {
        return res.status(400).json({ error: `A test with the name "${req.body.name}" already exists` });
      }
      if (error.fields && error.fields.shortcut) {
        return res.status(400).json({ error: `A test with the shortcut "${req.body.shortcut}" already exists` });
      }
    }
    
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// Update a test
router.put('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
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
      contract_id 
    } = req.body;
    
    const test = await db.test.findByPk(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    
    // Update fields, allowing empty strings for text fields
    test.name = name !== undefined ? name : test.name;
    test.shortcut = shortcut !== undefined ? (shortcut || null) : test.shortcut; // Convert empty string to null
    test.price = price !== undefined ? price : test.price;
    test.cost = cost !== undefined ? cost : test.cost;
    test.lab_to_lab_status = lab_to_lab_status !== undefined ? lab_to_lab_status : test.lab_to_lab_status;
    test.lab_name = lab_name !== undefined ? lab_name : test.lab_name;
    test.category_id = category_id !== undefined ? category_id : test.category_id;
    test.precautions = precautions !== undefined ? precautions : test.precautions;
    test.decreased_in = decreased_in !== undefined ? decreased_in : test.decreased_in;
    test.increased_in = increased_in !== undefined ? increased_in : test.increased_in;
    test.sample_type_id = sample_type_id !== undefined ? sample_type_id : test.sample_type_id;
    test.contract_id = contract_id !== undefined ? contract_id : test.contract_id;
    
    await test.save();
    res.json(test);
  } catch (error) {
    console.error('Error updating test:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.fields && error.fields.name) {
        return res.status(400).json({ error: `A test with the name "${req.body.name}" already exists` });
      }
      if (error.fields && error.fields.shortcut) {
        return res.status(400).json({ error: `A test with the shortcut "${req.body.shortcut}" already exists` });
      }
    }
    
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Delete a test
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const testInstance = await db.test.findByPk(req.params.id);
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
      // 1. Delete test components
      deletedComponents = await db.test_component.destroy({ 
        where: { test_id: req.params.id } 
      });
      console.log(`Deleted ${deletedComponents} test components`);
    } catch (error) {
      console.log(`Error deleting test components: ${error.message}`);
    }
    
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
router.get('/:id/components', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
  try {
    const testComponents = await db.test_component.findAll({
      where: { test_id: req.params.id }
    });
    res.json(testComponents);
  } catch (error) {
    console.error('Error fetching test components:', error);
    res.status(500).json({ error: 'Failed to fetch test components' });
  }
});

// Create test components
router.post('/:id/components', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { components } = req.body;
    const testId = req.params.id;
    
    // Delete existing components for this test
    await db.test_component.destroy({ where: { test_id: testId } });
    
    // Create new components
    const createdComponents = [];
    for (const component of components) {
      const created = await db.test_component.create({
        test_id: testId,
        name: component.name,
        unit: component.unit,
        normal_from: component.normal_from,
        normal_to: component.normal_to,
        c_low: component.c_low || null,
        c_high: component.c_high || null,
        gender: component.gender || null,
        age_start: component.age_start ? parseInt(component.age_start) : null,
        age_end: component.age_end ? parseInt(component.age_end) : null,
        reference_range: component.reference_range || null,
        result_type: component.result_type === 'boolean' ? 'boolean' : 'range',
      });
      createdComponents.push(created);
    }
    
    res.status(201).json(createdComponents);
  } catch (error) {
    console.error('Error creating test components:', error);
    res.status(500).json({ error: 'Failed to create test components' });
  }
});

// Update test components
router.put('/:id/components', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { components } = req.body;
    const testId = req.params.id;
    
    // Delete existing components for this test
    await db.test_component.destroy({ where: { test_id: testId } });
    
    // Create new components
    const updatedComponents = [];
    for (const component of components) {
      const created = await db.test_component.create({
        test_id: testId,
        name: component.name,
        unit: component.unit,
        normal_from: component.normal_from,
        normal_to: component.normal_to,
        c_low: component.c_low || null,
        c_high: component.c_high || null,
        gender: component.gender || null,
        age_start: component.age_start ? parseInt(component.age_start) : null,
        age_end: component.age_end ? parseInt(component.age_end) : null,
        reference_range: component.reference_range || null,
        result_type: component.result_type === 'boolean' ? 'boolean' : 'range',
      });
      updatedComponents.push(created);
    }
    
    res.json(updatedComponents);
  } catch (error) {
    console.error('Error updating test components:', error);
    res.status(500).json({ error: 'Failed to update test components' });
  }
});

// Optimized endpoint: get all tests with their components, category, and sample_type
router.get('/all-with-components', authenticateUser, authorizeRoles('admin', 'receptionist', 'chemist', 'doctor', 'employee'), async (req, res) => {
  try {
    const tests = await db.test.findAll({
      include: [
        {
          model: db.test_component,
          as: 'test_components',
        },
        {
          model: db.categories_test_and_culture,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: db.sample_type,
          as: 'sample_type',
          attributes: ['id', 'type']
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
    res.json(tests);
  } catch (error) {
    console.error('Error fetching all tests with components:', error);
    res.status(500).json({ error: 'Failed to fetch tests with components' });
  }
});

// Get test count
router.get('/count', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const count = await db.test.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get test count' });
  }
});

// Import tests from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    let imported = 0, updated = 0, errors = [];
    for (const row of data) {
      if (!row.Name || !row['Category ID']) {
        errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
        continue;
      }
      // Try to find by name
      let test = await db.test.findOne({ where: { name: row.Name } });
      const testData = {
        name: row.Name,
        shortcut: row.Shortcut || null,
        price: row.Price || null,
        cost: row.Cost || null,
        lab_to_lab_status: row['Lab to Lab Status'] || null,
        lab_name: row['Lab Name'] || null,
        category_id: row['Category ID'],
        precautions: row.Precautions || null,
        decreased_in: row['Decreased In'] || null,
        increased_in: row['Increased In'] || null,
        sample_type_id: row['Sample Type ID'] || null,
        contract_id: row['Contract ID'] || null
      };
      if (test) {
        await test.update(testData);
        updated++;
      } else {
        await db.test.create(testData);
        imported++;
      }
    }
    fs.unlinkSync(req.file.path);
    res.json({ imported, updated, errors });
  } catch (error) {
    console.error('Error importing tests:', error);
    res.status(500).json({ error: 'Failed to import tests' });
  }
});

module.exports = router;
