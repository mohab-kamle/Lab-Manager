const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const db = require("../models");

// Get paginated/searchable global tests
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist"), async (req, res) => {
  try {
    const { search = "", page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build search condition
    const whereCondition = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { loinc_code: { [Op.like]: `%${search}%` } },
        { patient_friendly_name: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows } = await db.global_test_catalog.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset,
      order: [['order_rank', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      tests: rows
    });
  } catch (error) {
    console.error('Error fetching global catalog tests:', error);
    res.status(500).json({ error: 'Failed to fetch global catalog tests', details: error.message });
  }
});

// Bulk import from global catalog into local catalog
router.post("/import-bulk", authenticateUser, authorizeRoles("admin"), require("../middleware/tenantContext").tenantContext, async (req, res) => {
  let transaction;
  try {
    transaction = await db.sequelize.transaction();
    const { global_test_ids } = req.body;

    if (!global_test_ids || !Array.isArray(global_test_ids) || global_test_ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Please provide an array of global_test_ids to import." });
    }

    // Fetch the requested global tests
    const globalTests = await db.global_test_catalog.findAll({
      where: {
        id: {
          [Op.in]: global_test_ids
        }
      },
      transaction
    });

    if (globalTests.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "None of the requested global tests were found." });
    }

    // Cache categories to map global_category to local category_id
    const localCategories = await db.categories_test_and_culture.findAll({ transaction });
    let fallbackCategory = localCategories.length > 0 ? localCategories[0].id : null;

    if (!fallbackCategory) {
      // If the user's DB has no categories, create a default one to safely proceed with the import
      const defaultCat = await db.categories_test_and_culture.create({ name: 'General Tests' }, { transaction });
      fallbackCategory = defaultCat.id;
      localCategories.push(defaultCat);
    }

    const importedTests = [];
    let idCounter = 1;

    for (const globalTest of globalTests) {
      // Avoid inserting if test with the exact name already exists locally to prevent unique contraint errors
      const existingTest = await db.test.findOne({
        where: { 
          name: globalTest.name,
          lab_id: req.tenant.lab_id
        },
        transaction
      });

      if (existingTest) {
        continue; // Skip if already exists
      }

      // Map global_category
      let categoryId = fallbackCategory;
      if (globalTest.global_category) {
        const matchingCat = localCategories.find(c => c.name.toLowerCase() === globalTest.global_category.toLowerCase());
        if (matchingCat) {
          categoryId = matchingCat.id;
        } else {
          // Dynamic category creation: If this specific category doesn't exist locally, create it exactly as named!
          const [newCat] = await db.categories_test_and_culture.findOrCreate({ 
            where: { name: globalTest.global_category },
            transaction
          });
          localCategories.push(newCat);
          categoryId = newCat.id;
        }
      }

      // Map structure_config gracefully from default_structure
      const structureConfig = [];
      let defaultStruct = globalTest.default_structure;
      
      // Sequelize parsed JSON automatically, but just in case it's a string
      if (typeof defaultStruct === 'string') {
        try { defaultStruct = JSON.parse(defaultStruct); } catch (e) { defaultStruct = {};  }
      }

      if (defaultStruct) {
        // Main component definition
        structureConfig.push({
          key: `comp_${Date.now()}_${idCounter++}`,
          type: defaultStruct.ui_type === 'options' ? 'boolean' : (defaultStruct.is_culture ? 'culture_panel' : 'range'),
          label: defaultStruct.component || globalTest.name,
          unit: defaultStruct.units || defaultStruct.ucum_units || '',
          reference_ranges: defaultStruct.ui_type === 'options' ? [] : [{
            gender: 'Any',
            age_min: null,
            age_max: null,
            min: null,
            max: null,
            panic_min: null,
            panic_max: null
          }],
          reference_range: null
        });

        // Map children if it's a panel
        if (defaultStruct.children && Array.isArray(defaultStruct.children)) {
          for (const child of defaultStruct.children) {
            let childName = child.name;
            let childUnit = '';

            // If the panel structure only stored the code (common in basic LOINC Panel mappings), dynamically query the DB for the beautiful name!
            if (!childName && child.code) {
              const catalogEntry = await db.global_test_catalog.findOne({
                where: { loinc_code: child.code },
                attributes: ['name', 'default_structure'],
                transaction
              });
              if (catalogEntry) {
                childName = catalogEntry.name;
                if (catalogEntry.default_structure && catalogEntry.default_structure.units) {
                  childUnit = catalogEntry.default_structure.units;
                }
              }
            }

            structureConfig.push({
              key: `comp_${Date.now()}_${idCounter++}`,
              type: 'range',
              label: childName || child.code,
              unit: childUnit,
              reference_ranges: [{
                gender: 'Any',
                age_min: null,
                age_max: null,
                min: null,
                max: null,
                panic_min: null,
                panic_max: null
              }],
              reference_range: null
            });
          }
        }
      }

      const newTest = await db.test.create({
        lab_id: req.tenant.lab_id,
        name: globalTest.name,
        shortcut: globalTest.patient_friendly_name || globalTest.name,
        price: 0.00,
        cost: 0.00,
        lab_to_lab_status: 'IN', // Default
        category_id: categoryId,
        global_test_id: globalTest.id,
        structure_config: structureConfig,
        type: globalTest.type || 'single'
      }, { transaction });

      importedTests.push(newTest);
    }

    await transaction.commit();

    res.status(201).json({
      message: `Successfully imported ${importedTests.length} tests (skipped ${globalTests.length - importedTests.length} duplicates).`,
      importedCount: importedTests.length,
      skippedCount: globalTests.length - importedTests.length,
      tests: importedTests
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error in bulk import:', error);
    res.status(500).json({ 
        error: 'Failed to import tests', 
        details: error.message,
        stack: error.stack,
        full: error
    });
  }
});

module.exports = router;
