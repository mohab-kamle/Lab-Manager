const express = require("express");
const router = express.Router();
require("dotenv").config();
const { culture_sub_option, culture_option } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { Op } = require('sequelize');

// GET all culture sub-options with optional filtering by culture_option_id
router.get("/", authenticateUser, authorizeRoles("admin", "chemist", "employee"), async (req, res) => {
  try {
    const { culture_option_id } = req.query;
    
    const whereClause = {};
    if (culture_option_id) {
      whereClause.culture_option_id = culture_option_id;
    }
    whereClause.deletedAt = null; // Only non-deleted records

    const cultureSubOptions = await culture_sub_option.findAll({
      where: whereClause,
      include: [{
        model: culture_option,
        as: 'option',
        attributes: ['id', 'option']
      }],
      order: [['name', 'ASC']]
    });

    res.json(cultureSubOptions);
  } catch (error) {
    console.error('Error fetching culture sub-options:', error);
    res.status(500).json({ error: "Failed to fetch culture sub-options" });
  }
});

// GET a single culture sub-option by ID
router.get('/:id', authenticateUser, authorizeRoles('admin', 'chemist', 'employee'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const subOption = await culture_sub_option.findOne({
      where: { 
        id,
        deletedAt: null 
      },
      include: [{
        model: culture_option,
        as: 'option',
        attributes: ['id', 'option']
      }]
    });

    if (!subOption) {
      return res.status(404).json({ error: 'Culture sub-option not found' });
    }

    res.json(subOption);
  } catch (error) {
    console.error('Error fetching culture sub-option:', error);
    res.status(500).json({ error: 'Failed to fetch culture sub-option' });
  }
});

// POST - Create new culture sub-option
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, culture_option_id, is_active = true } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!culture_option_id) {
      return res.status(400).json({ error: 'Culture option ID is required' });
    }

    // Check if culture option exists
    const cultureOption = await culture_option.findByPk(culture_option_id);
    if (!cultureOption) {
      return res.status(404).json({ error: 'Culture option not found' });
    }

    // Check if sub-option already exists for this culture option
    const existingSubOption = await culture_sub_option.findOne({ 
      where: { 
        name: name.trim(),
        culture_option_id,
        deletedAt: null
      } 
    });
    
    if (existingSubOption) {
      return res.status(400).json({ 
        error: 'A sub-option with this name already exists for the selected culture option' 
      });
    }

    const newSubOption = await culture_sub_option.create({
      name: name.trim(),
      culture_option_id,
      is_active: Boolean(is_active)
    });

    // Include the culture_option in the response
    const createdSubOption = await culture_sub_option.findByPk(newSubOption.id, {
      include: [{
      model: culture_option,
      as: 'option',
      attributes: ['id', 'option']
    }]
    });

    res.status(201).json(createdSubOption);
  } catch (error) {
    console.error('Error creating culture sub-option:', error);
    res.status(500).json({ error: 'Failed to create culture sub-option' });
  }
});

// PUT - Update culture sub-option
router.put('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, culture_option_id, is_active } = req.body;

    // Validate input
    if (name && name.trim() === '') {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const subOption = await culture_sub_option.findByPk(id);
    if (!subOption || subOption.deletedAt !== null) {
      return res.status(404).json({ error: 'Culture sub-option not found' });
    }

    // If culture_option_id is being updated, verify it exists
    if (culture_option_id && culture_option_id !== subOption.culture_option_id) {
      const cultureOption = await culture_option.findByPk(culture_option_id);
      if (!cultureOption) {
        return res.status(400).json({ error: 'Invalid culture option' });
      }
    }

    // Check for duplicate name if name is being updated
    if (name && name.trim() !== subOption.name) {
      const existingSubOption = await culture_sub_option.findOne({
        where: {
          name: name.trim(),
          culture_option_id: culture_option_id || subOption.culture_option_id,
          id: { [Op.ne]: id },
          deletedAt: null
        }
      });

      if (existingSubOption) {
        return res.status(400).json({ 
          error: 'A sub-option with this name already exists for the selected culture option' 
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (culture_option_id) updateData.culture_option_id = culture_option_id;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    await subOption.update(updateData);

    // Fetch the updated record with associations
    const updatedSubOption = await culture_sub_option.findByPk(id, {
      include: [{
        model: culture_option,
        as: 'culture_option',
        attributes: ['id', 'option']
      }]
    });

    res.json(updatedSubOption);
  } catch (error) {
    console.error('Error updating culture sub-option:', error);
    res.status(500).json({ error: 'Failed to update culture sub-option' });
  }
});

// DELETE - Soft delete culture sub-option
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const subOption = await culture_sub_option.findByPk(id);
    if (!subOption || subOption.deletedAt !== null) {
      return res.status(404).json({ error: 'Culture sub-option not found' });
    }

    // Soft delete by setting deletedAt timestamp
    await subOption.destroy();
    
    res.json({ message: 'Culture sub-option deleted successfully' });
  } catch (error) {
    console.error('Error deleting culture sub-option:', error);
    res.status(500).json({ error: 'Failed to delete culture sub-option' });
  }
});

module.exports = router;