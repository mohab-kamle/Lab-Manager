const express = require('express');
const router = express.Router();
const db = require('../models');
const { test_group, tgc_category, tg_component, tg_fields, field_comp_options, sequelize } = require('../models');
const { Op } = require('sequelize');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');

const allowedRoles = ['admin', 'chemist', 'receptionist', 'doctor', 'employee'];

// Test endpoint to check database connection and models
router.get('/test', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful');
    
    // Test if models are properly loaded
    console.log('Available models:', Object.keys(db));
    console.log('test_group model:', test_group ? 'loaded' : 'not loaded');
    console.log('tgc_category model:', tgc_category ? 'loaded' : 'not loaded');
    console.log('tg_component model:', tg_component ? 'loaded' : 'not loaded');
    console.log('tg_fields model:', tg_fields ? 'loaded' : 'not loaded');
    console.log('field_comp_options model:', field_comp_options ? 'loaded' : 'not loaded');
    
    res.json({ 
      status: 'ok', 
      message: 'Database connection and models are working',
      models: Object.keys(db)
    });
  } catch (err) {
    console.error('Database test failed:', err);
    res.status(500).json({ error: 'Database test failed', details: err.message });
  }
});

// Get all test groups (active only by default, with option to include deleted)
router.get('/', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  try {
    const { includeDeleted = false } = req.query;
    
    let groups;
    if (includeDeleted === 'true') {
      // Include soft-deleted groups for admin purposes
      groups = await test_group.scope('withDeleted').findAll();
    } else {
      // Only active groups for normal operations
      groups = await test_group.scope('active').findAll();
    }
    
    // Return empty array if no groups found (instead of null)
    res.json(groups || []);
  } catch (err) {
    console.error('Error fetching test groups:', err);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// Create a new test group with nested data
router.post('/', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, price, tgc_categories = [], tg_components = [], tg_fields: tg_fields_data = [], field_comp_options: field_comp_options_data = [] } = req.body;
    
    console.log('Creating test group with payload:', { name, price, tgc_categories, tg_components, tg_fields: tg_fields_data, field_comp_options: field_comp_options_data });
    
    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      await t.rollback();
      return res.status(400).json({ error: 'Test group name is required.' });
    }
    
    // Unique test group name
    const existing = await test_group.findOne({ where: {  name , lab_id: req.tenant.lab_id }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ error: 'Test group name must be unique.' });
    }
    
    // Create test group (include price)
    const group = await test_group.create({ 
      name: name.trim(), 
      price: price !== undefined && price !== null ? parseFloat(price) : 0.00 // Default to 0 if no price provided
    }, { transaction: t });
    
    console.log('Created test group:', group.toJSON());
    
    // Helper maps for IDs
    const categoryMap = {};
    const componentMap = {};
    const fieldMap = {};
    
    // Categories and their components
    for (const cat of tgc_categories) {
      if (!cat.name || typeof cat.name !== 'string' || !cat.name.trim()) {
        await t.rollback();
        return res.status(400).json({ error: 'Category name is required.' });
      }
      // Unique category name within group
      if (tgc_categories.filter(c => c.name === cat.name).length > 1) {
        await t.rollback();
        return res.status(400).json({ error: `Duplicate category name: ${cat.name}` });
      }
      const newCat = await tgc_category.create({ name: cat.name.trim(), test_group_id: group.id }, { transaction: t });
      categoryMap[cat.id] = newCat.id;
      
      // Components in category
      if (cat.tg_components && Array.isArray(cat.tg_components)) {
        for (const comp of cat.tg_components) {
          if (!comp.name || typeof comp.name !== 'string' || !comp.name.trim()) {
            await t.rollback();
            return res.status(400).json({ error: 'Component name is required.' });
          }
          // Unique component name within category
          if (cat.tg_components.filter(c => c.name === comp.name).length > 1) {
            await t.rollback();
            return res.status(400).json({ error: `Duplicate component name in category ${cat.name}: ${comp.name}` });
          }
          const newComp = await tg_component.create({ 
            name: comp.name.trim(), 
            test_group_id: group.id, 
            test_category_id: newCat.id,
            reference_range: comp.reference_range || null,
            result_type: comp.result_type === 'boolean' ? 'boolean' : 'range'
          }, { transaction: t });
          componentMap[comp.id] = newComp.id;
        }
      }
    }
    
    // Direct components
    for (const comp of tg_components) {
      if (!comp.name || typeof comp.name !== 'string' || !comp.name.trim()) {
        await t.rollback();
        return res.status(400).json({ error: 'Component name is required.' });
      }
      // Unique component name among direct components
      if (tg_components.filter(c => c.name === comp.name).length > 1) {
        await t.rollback();
        return res.status(400).json({ error: `Duplicate direct component name: ${comp.name}` });
      }
      const newComp = await tg_component.create({ 
        name: comp.name.trim(), 
        test_group_id: group.id, 
        test_category_id: null,
        reference_range: comp.reference_range || null,
        result_type: comp.result_type === 'boolean' ? 'boolean' : 'range'
      }, { transaction: t });
      componentMap[comp.id] = newComp.id;
    }
    
    // Fields
    for (const field of tg_fields_data) {
      if (!field.name || typeof field.name !== 'string' || !field.name.trim()) {
        await t.rollback();
        return res.status(400).json({ error: 'Field name is required.' });
      }
      // Unique field name within group
      if (tg_fields_data.filter(f => f.name === field.name).length > 1) {
        await t.rollback();
        return res.status(400).json({ error: `Duplicate field name: ${field.name}` });
      }
      const newField = await tg_fields.create({ 
        name: field.name.trim(), 
        test_group_id: group.id 
      }, { transaction: t });
      fieldMap[field.id] = newField.id;
    }
    
    // Field/Component Options
    for (const option of field_comp_options_data) {
      if (!option.name || typeof option.name !== 'string' || !option.name.trim()) {
        await t.rollback();
        return res.status(400).json({ error: 'Option name is required.' });
      }
      // Unique option name for field/component pair
      if (field_comp_options_data.filter(o => o.tg_fields_id === option.tg_fields_id && o.tg_component_id === option.tg_component_id && o.name === option.name).length > 1) {
        await t.rollback();
        return res.status(400).json({ error: `Duplicate option name for field/component: ${option.name}` });
      }
      // Map temp IDs to real IDs
      const realFieldId = fieldMap[option.tg_fields_id];
      const realCompId = componentMap[option.tg_component_id];
      if (!realFieldId || !realCompId) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid field/component reference in options.' });
      }
      await field_comp_options.create({ 
        name: option.name.trim(), 
        test_group_id: group.id, 
        tg_fields_id: realFieldId, 
        tg_component_id: realCompId 
      }, { transaction: t });
    }
    
    await t.commit();
    console.log('Successfully created test group with ID:', group.id);
    res.status(201).json({ success: true, id: group.id });
  } catch (err) {
    await t.rollback();
    console.error('Error creating test group with nested data:', err);
    console.error('Error details:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create test group with nested data', details: err.message });
  }
});

// Update a test group with nested data
router.put('/:id', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, price, tgc_categories = [], tg_components = [], tg_fields: tg_fields_data = [], field_comp_options: field_comp_options_data = [] } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Test group name is required.' });
    }

    // Find existing group
    const group = await test_group.findByPk(id, { transaction: t });
    if (!group) {
      await t.rollback();
      return res.status(404).json({ error: 'Test group not found' });
    }

    // Update basic group info
    group.name = name;
    group.price = price !== undefined ? price : null;
    await group.save({ transaction: t });

    // Get existing data
    const existingCategories = await tgc_category.findAll({ where: { test_group_id: id }, transaction: t });
    const existingComponents = await tg_component.findAll({ where: { test_group_id: id }, transaction: t });
    const existingFields = await tg_fields.findAll({ where: { test_group_id: id }, transaction: t });
    // existing options will be fetched later for diffing

    // Create maps of existing data by ID
    const existingCategoriesMap = new Map(existingCategories.map(cat => [cat.id, cat]));
    const existingComponentsMap = new Map(existingComponents.map(comp => [comp.id, comp]));
    const existingFieldsMap = new Map(existingFields.map(field => [field.id, field]));
    
    // Helper maps for ID mapping
    const categoryMap = {};
    const componentMap = {};
    const fieldMap = {};
    
    // Track which IDs we've processed to know which ones to soft-delete later
    const processedCategoryIds = new Set();
    const processedComponentIds = new Set();
    const processedFieldIds = new Set();

    // Update or create categories
    for (const cat of tgc_categories) {
      if (!cat.name || typeof cat.name !== 'string' || !cat.name.trim()) {
        await t.rollback();
        return res.status(400).json({ error: 'Category name is required.' });
      }

      if (cat.id && existingCategoriesMap.has(cat.id)) {
        // Update existing category
        await existingCategoriesMap.get(cat.id).update(
          { 
            name: cat.name,
            deleted_at: null // Reset deleted_at if it was soft-deleted
          },
          { transaction: t }
        );
        categoryMap[cat.id] = cat.id;
        processedCategoryIds.add(cat.id);
      } else {
        // Attempt to resurrect a previously soft-deleted category with the same name
        let resurrectCat = await tgc_category.scope('withDeleted').findOne({
          where: { test_group_id: id, name: cat.name },
          transaction: t,
          paranoid: false
        });

        if (resurrectCat) {
          // Bring it back (clear deleted_at) and update name in case casing changed
          await resurrectCat.update({ deleted_at: null, name: cat.name }, { transaction: t });
          categoryMap[cat.id] = resurrectCat.id;
        } else {
          // Create brand-new category
          const newCat = await tgc_category.create(
            {
              name: cat.name,
              test_group_id: id,
            },
            { transaction: t }
          );
          categoryMap[cat.id] = newCat.id;
        }
      }
      
      // Handle components in this category
      const categoryComponents = cat.tg_components || [];
      for (const comp of categoryComponents) {
        if (comp.id && existingComponentsMap.has(comp.id)) {
          // Update existing component
          await existingComponentsMap.get(comp.id).update(
            { 
              name: comp.name,
              test_category_id: categoryMap[cat.id] || null,
              deleted_at: null
            },
            { transaction: t }
          );
          componentMap[comp.id] = comp.id;
          processedComponentIds.add(comp.id);
        } else {
          // Upsert/resurrect component in this category by unique (test_group_id, test_category_id, name)
          const resurrectComp = await tg_component.scope('withDeleted').findOne({
            where: {
              test_group_id: id,
              test_category_id: categoryMap[cat.id] || null,
              name: comp.name
            },
            transaction: t,
            paranoid: false
          });

          let savedComp;
          if (resurrectComp) {
            await resurrectComp.update({ deleted_at: null }, { transaction: t });
            savedComp = resurrectComp;
          } else {
            savedComp = await tg_component.create(
              {
                name: comp.name,
                test_group_id: id,
                test_category_id: categoryMap[cat.id] || null,
                reference_range: comp.reference_range || null,
                result_type: comp.result_type === 'boolean' ? 'boolean' : 'range'
              },
              { transaction: t }
            );
          }
          componentMap[comp.id] = savedComp.id;
          processedComponentIds.add(savedComp.id);
        }
      }

    }

    // Handle root-level components (not in any category)
    for (const comp of tg_components) {
      if (comp.id && existingComponentsMap.has(comp.id)) {
        // Update existing component
        await existingComponentsMap.get(comp.id).update(
          { 
            name: comp.name,
            test_category_id: null,
            deleted_at: null
          },
          { transaction: t }
        );
        componentMap[comp.id] = comp.id;
        processedComponentIds.add(comp.id);
      } else {
        // Upsert/resurrect root-level component by unique (test_group_id, name, null category)
        const resurrectComp = await tg_component.scope('withDeleted').findOne({
          where: {
            test_group_id: id,
            test_category_id: null,
            name: comp.name
          },
          transaction: t,
          paranoid: false
        });

        let savedComp;
        if (resurrectComp) {
          await resurrectComp.update({ deleted_at: null }, { transaction: t });
          savedComp = resurrectComp;
        } else {
          savedComp = await tg_component.create(
            {
              name: comp.name,
              test_group_id: id,
              test_category_id: null,
              reference_range: comp.reference_range || null,
              result_type: comp.result_type === 'boolean' ? 'boolean' : 'range'
            },
            { transaction: t }
          );
        }
        componentMap[comp.id] = savedComp.id;
        processedComponentIds.add(savedComp.id);
      }
    }

    /*
    // Handle deletions in proper order - must delete dependencies first
    
{{ ... }}
    // 1. First identify all entities to delete
    const componentsToDelete = existingComponents.filter(comp => !processedComponentIds.has(comp.id));
    const fieldsToDelete = existingFields.filter(field => !processedFieldIds.has(field.id));
    const categoriesToDelete = existingCategories.filter(cat => !processedCategoryIds.has(cat.id));
    
    // 2. Soft-delete options that reference any field or component we’re removing
    if (fieldsToDelete.length > 0) {
      await field_comp_options.update(
        { deleted_at: new Date() },
        {
          where: { tg_fields_id: { [Op.in]: fieldsToDelete.map(f => f.id) } },
          transaction: t,
          paranoid: false
        }
      );
    }
    if (componentsToDelete.length > 0) {
      await field_comp_options.update(
        { deleted_at: new Date() },
        {
          where: { tg_component_id: { [Op.in]: componentsToDelete.map(c => c.id) } },
          transaction: t,
          paranoid: false
        }
      );
    }
    
    // 3. Delete components
    if (componentsToDelete.length > 0) {
      await tg_component.update(
        { deleted_at: new Date() },
        { 
          where: { 
            id: { [Op.in]: componentsToDelete.map(c => c.id) }
          },
          transaction: t 
        }
      );
    }
    
    // 4. Delete fields
    if (fieldsToDelete.length > 0) {
      await tg_fields.update(
        { deleted_at: new Date() },
        { 
          where: { 
            id: { [Op.in]: fieldsToDelete.map(f => f.id) }
          },
          transaction: t 
        }
      );
    }
    
    // 5. Delete categories (last since they may have components)
    if (categoriesToDelete.length > 0) {
      await tgc_category.update(
        { deleted_at: new Date() },
        { 
          where: { 
            id: { [Op.in]: categoriesToDelete.map(c => c.id) }
          },
          transaction: t 
        }
      );
    }

    */
    // Update or mark fields as deleted
    for (const field of tg_fields_data) {
      if (field.id && existingFieldsMap.has(field.id)) {
        // Update existing field
        await existingFieldsMap.get(field.id).update(
          {
            name: field.name,
            deleted_at: null // Reset deleted_at if it was soft-deleted
          },
          { transaction: t }
        );
        // Map temp ID to real (unchanged) ID so options can reference it
        fieldMap[field.id] = field.id;
        processedFieldIds.add(Number(field.id));
      } else {
        // Create new field
        // Upsert (insert or resurrect) field by unique (test_group_id, name)
        const [savedField] = await tg_fields.upsert(
          {
            test_group_id: id,
            name: field.name,
            deleted_at: null
          },
          {
            conflictFields: ['test_group_id', 'name'],
            returning: true,
            transaction: t
          }
        );
        // Map temp client ID to real DB ID for later option processing
        if (field.id) {
          fieldMap[field.id] = savedField.id;
        }
        processedFieldIds.add(Number(savedField.id));
      }
      if (field.id && !processedFieldIds.has(Number(field.id))) {
        processedFieldIds.add(Number(field.id));
      }
    }

    // Deletion handling AFTER processing all entities
    const componentsToDelete = existingComponents.filter(comp => !processedComponentIds.has(comp.id));
    const fieldsToDelete = existingFields.filter(field => !processedFieldIds.has(field.id));
    const categoriesToDelete = existingCategories.filter(cat => !processedCategoryIds.has(cat.id));

    // Soft-delete options referencing removed fields or components
    if (fieldsToDelete.length > 0) {
      await field_comp_options.update(
        { deleted_at: new Date() },
        {
          where: { tg_fields_id: { [Op.in]: fieldsToDelete.map(f => f.id) } },
          transaction: t,
          paranoid: false
        }
      );
    }
    if (componentsToDelete.length > 0) {
      await field_comp_options.update(
        { deleted_at: new Date() },
        {
          where: { tg_component_id: { [Op.in]: componentsToDelete.map(c => c.id) } },
          transaction: t,
          paranoid: false
        }
      );
    }

    // Soft-delete removed components
    if (componentsToDelete.length > 0) {
      await tg_component.update(
        { deleted_at: new Date() },
        {
          where: { id: { [Op.in]: componentsToDelete.map(c => c.id) } },
          transaction: t
        }
      );
    }

    // Soft-delete removed fields
    if (fieldsToDelete.length > 0) {
      await tg_fields.update(
        { deleted_at: new Date() },
        {
          where: { id: { [Op.in]: fieldsToDelete.map(f => f.id) } },
          transaction: t
        }
      );
    }

    // Soft-delete removed categories (last)
    if (categoriesToDelete.length > 0) {
      await tgc_category.update(
        { deleted_at: new Date() },
        {
          where: { id: { [Op.in]: categoriesToDelete.map(c => c.id) } },
          transaction: t
        }
      );
    }

    // Fetch current options once so we can diff
    const allOptions = await field_comp_options.findAll({
      where: { test_group_id: id },
      transaction: t,
      paranoid: false // include soft-deleted rows so we can resurrect
    });
    const allOptionsMap = new Map(allOptions.map(o => [o.id, o]));
    const processedOptionIds = new Set();
    
    // Create or update each option coming from the client

    for (const option of field_comp_options_data) {
      if (!option.name || typeof option.name !== 'string' || !option.name.trim()) {
        await t.rollback();
        return res.status(400).json({ error: 'Option name is required.' });
      }

      const realFieldId = fieldMap[option.tg_fields_id] || option.tg_fields_id;
      const realCompId = componentMap[option.tg_component_id] || option.tg_component_id;

      if (!realFieldId || !realCompId) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid field/component reference in options.' });
      }

      // Check for duplicate option names for the same field/component
      const duplicateOption = field_comp_options_data.find(o => 
        o !== option && 
        (fieldMap[o.tg_fields_id] || o.tg_fields_id) === realFieldId && 
        (componentMap[o.tg_component_id] || o.tg_component_id) === realCompId &&
        o.name === option.name
      );

      if (duplicateOption) {
        await t.rollback();
        return res.status(400).json({ 
          error: `Duplicate option name for field/component: ${option.name}` 
        });
      }
      
      // Create or update the option and capture the persisted row
      const [savedOption] = await field_comp_options.upsert(
        {
          tg_fields_id: realFieldId,
          tg_component_id: realCompId,
          name: option.name,
          test_group_id: id,
          deleted_at: null
        },
        {
          conflictFields: ['test_group_id','tg_fields_id', 'tg_component_id', 'name'],
          returning: true,
          transaction: t
        }
      );
      processedOptionIds.add(savedOption.id);

    }

    // Soft delete options that were not sent from the client
    const optionIdsToDelete = [...allOptionsMap.keys()].filter(id => !processedOptionIds.has(id));
    if (optionIdsToDelete.length > 0) {
      await field_comp_options.update(
        { deleted_at: new Date() },
        {
          where: { id: { [Op.in]: optionIdsToDelete } },
          transaction: t
        }
      );
    }

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    console.error('Error updating test group with nested data:', err);
    res.status(500).json({ error: 'Failed to update test group with nested data' });
  }
});

// Soft delete a test group
router.delete('/:id', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await test_group.findByPk(id);
    if (!group) return res.status(404).json({ error: 'Test group not found' });
    
    // Soft delete by setting deleted_at timestamp
    await group.update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Test group soft deleted successfully' });
  } catch (err) {
    console.error('Error soft deleting test group:', err);
    res.status(500).json({ error: 'Failed to soft delete test group' });
  }
});

// Restore a soft-deleted test group
router.post('/:id/restore', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await test_group.scope('withDeleted').findByPk(id);
    if (!group) return res.status(404).json({ error: 'Test group not found' });
    
    if (!group.deleted_at) {
      return res.status(400).json({ error: 'Test group is not deleted' });
    }
    
    // Restore by clearing deleted_at timestamp
    await group.update({ deleted_at: null });
    res.json({ success: true, message: 'Test group restored successfully' });
  } catch (err) {
    console.error('Error restoring test group:', err);
    res.status(500).json({ error: 'Failed to restore test group' });
  }
});

// Hard delete a test group (admin only)
router.delete('/:id/hard', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await test_group.scope('withDeleted').findByPk(id);
    if (!group) return res.status(404).json({ error: 'Test group not found' });
    
    // Check if this test group is used in any medical reports
    const medicalReportCount = await db.medical_report_has_tg.count({
      where: { test_group_id: id }
    });
    
    if (medicalReportCount > 0) {
      return res.status(400).json({ 
        error: `Cannot hard delete test group. It is used in ${medicalReportCount} medical report(s). Use soft delete instead.` 
      });
    }
    
    // Hard delete
    await group.destroy({ force: true });
    res.json({ success: true, message: 'Test group permanently deleted' });
  } catch (err) {
    console.error('Error hard deleting test group:', err);
    res.status(500).json({ error: 'Failed to hard delete test group' });
  }
});

// Get all test group components (flat list for viewing)
router.get('/components', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  try {
    const components = await tg_component.findAll({
      include: [
        { model: test_group, as: 'test_group', attributes: ['id', 'name'] },
        { model: tgc_category, as: 'category', attributes: ['id', 'name'] }
      ]
    });
    // Return empty array if no components found
    res.json(components || []);
  } catch (err) {
    console.error('Error fetching test group components:', err);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// Get a test group with all nested data
router.get('/:id', authenticateUser, authorizeRoles(...allowedRoles), tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await test_group.findByPk(id, {
      include: [
        {
          model: tgc_category,
          as: 'tgc_categories',
          required: false,
          include: [
            {
              model: tg_component,
              as: 'tg_components',
              required: false,
            }
          ]
        },
        {
          model: tg_component,
          as: 'tg_components',
          where: { test_category_id: null }, // direct components only
          required: false
        },
        {
          model: tg_fields,
          as: 'tg_fields',
          required: false,
        },
        {
          model: field_comp_options,
          as: 'field_comp_options',
          required: false,
        }
      ]
    });
    if (!group) return res.status(404).json({ error: 'Test group not found' });
    res.json(group);
  } catch (err) {
    console.error('Error fetching test group with nested data:', err);
    res.status(500).json({ error: 'Failed to fetch test group with nested data' });
  }
});

module.exports = router;