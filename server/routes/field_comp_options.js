const express = require('express');
const router = express.Router();
const { field_comp_options } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

const allowedRoles = ['admin', 'chemist', 'receptionist', 'doctor', 'employee'];

// GET all field component options
router.get('/', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const options = await field_comp_options.findAll({
      order: [['name', 'ASC']]
    });
    res.json(options);
  } catch (error) {
    console.error('Error fetching field component options:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - Create new field component option
router.post('/', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { name, tg_fields_id, tg_component_id, test_group_id } = req.body;
    
    // Validate required fields
    if (!name || !tg_fields_id || !tg_component_id) {
      return res.status(400).json({ 
        error: 'Name, tg_fields_id, and tg_component_id are required' 
      });
    }

    // Check if option already exists for this field/component combination
    const existingOption = await field_comp_options.findOne({ 
      where: { 
        name: name.trim(),
        tg_fields_id,
        tg_component_id,
        test_group_id: test_group_id || null
      } 
    });
    
    if (existingOption) {
      return res.status(400).json({ 
        error: 'Option with this name already exists for this field/component combination' 
      });
    }

    // Create new option
    const newOption = await field_comp_options.create({
      name: name.trim(),
      tg_fields_id,
      tg_component_id,
      test_group_id: test_group_id || null
    });

    res.status(201).json(newOption);
  } catch (error) {
    console.error('Error creating field component option:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT - Update field component option
router.put('/:id', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const option = await field_comp_options.findByPk(id);
    
    if (!option) {
      return res.status(404).json({ error: 'Field component option not found' });
    }

    // Check for duplicate name in same field/component combination
    const duplicateOption = await field_comp_options.findOne({
      where: {
        name: name.trim(),
        tg_fields_id: option.tg_fields_id,
        tg_component_id: option.tg_component_id,
        id: { [require('sequelize').Op.ne]: id }
      }
    });

    if (duplicateOption) {
      return res.status(400).json({ 
        error: 'Option with this name already exists for this field/component combination' 
      });
    }

    await option.update({ name: name.trim() });
    res.json(option);
  } catch (error) {
    console.error('Error updating field component option:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Soft delete field component option
router.delete('/:id', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { id } = req.params;
    
    const option = await field_comp_options.findByPk(id);
    
    if (!option) {
      return res.status(404).json({ error: 'Field component option not found' });
    }

    // Soft delete by setting deleted_at
    await option.update({ deleted_at: new Date() });
    res.json({ message: 'Field component option deleted successfully' });
  } catch (error) {
    console.error('Error deleting field component option:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;