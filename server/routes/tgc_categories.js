const express = require('express');
const router = express.Router();
const { tgc_category, test_group } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

const allowedRoles = ['admin', 'chemist', 'receptionist', 'doctor', 'employee'];

// Get all categories (active only by default, with option to include deleted)
router.get('/', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { includeDeleted = false } = req.query;
    
    let categories;
    if (includeDeleted === 'true') {
      // Include soft-deleted categories for admin purposes
      categories = await tgc_category.scope('withDeleted').findAll({
        include: [
          {
            model: test_group,
            as: 'test_group',
            attributes: ['id', 'name']
          }
        ]
      });
    } else {
      // Only active categories for normal operations
      categories = await tgc_category.findAll({
        include: [
          {
            model: test_group,
            as: 'test_group',
            attributes: ['id', 'name']
          }
        ]
      });
    }
    // Return empty array if no categories found
    res.json(categories || []);
  } catch (err) {
    console.error('Error fetching test group categories:', err);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// Create a new category
router.post('/', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { name, test_group_id } = req.body;
    const newCategory = await tgc_category.create({ name, test_group_id });
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error creating test group category:', err);
    res.status(500).json({ error: 'Failed to create test group category' });
  }
});

// Update a category
router.put('/:id', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, test_group_id } = req.body;
    const category = await tgc_category.findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    category.name = name;
    category.test_group_id = test_group_id;
    await category.save();
    res.json(category);
  } catch (err) {
    console.error('Error updating test group category:', err);
    res.status(500).json({ error: 'Failed to update test group category' });
  }
});

// Soft delete a category
router.delete('/:id', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { id } = req.params;
    const category = await tgc_category.findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    // Soft delete by setting deleted_at timestamp
    await category.update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Category soft deleted successfully' });
  } catch (err) {
    console.error('Error soft deleting test group category:', err);
    res.status(500).json({ error: 'Failed to soft delete test group category' });
  }
});

// Restore a soft-deleted category
router.post('/:id/restore', authenticateUser, authorizeRoles(...allowedRoles), async (req, res) => {
  try {
    const { id } = req.params;
    const category = await tgc_category.scope('withDeleted').findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    if (!category.deleted_at) {
      return res.status(400).json({ error: 'Category is not deleted' });
    }
    
    // Restore by clearing deleted_at timestamp
    await category.update({ deleted_at: null });
    res.json({ success: true, message: 'Category restored successfully' });
  } catch (err) {
    console.error('Error restoring test group category:', err);
    res.status(500).json({ error: 'Failed to restore test group category' });
  }
});

module.exports = router; 