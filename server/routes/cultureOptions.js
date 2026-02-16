const express = require("express");
const router = express.Router();
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { culture_option, culture_sub_option } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");

// GET all culture options
router.get("/", authenticateUser, authorizeRoles("admin", "chemist", "employee", "doctor"), async (req, res) => {
  try {
    const cultureOptionsList = await culture_option.findAll({
      order: [['option', 'ASC']]
    });
    res.json(cultureOptionsList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST - Create new culture option
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if option already exists
    const existingOption = await culture_option.findOne({ where: { option: name.trim() } });
    if (existingOption) {
      return res.status(400).json({ error: 'Culture option with this name already exists' });
    }

    const newCultureOption = await culture_option.create({
      option: name.trim()
    });

    res.status(201).json(newCultureOption);
  } catch (error) {
    console.error('Error creating culture option:', error);
    res.status(500).json({ error: 'Failed to create culture option' });
  }
});

// PUT - Update culture option
router.put('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const cultureOption = await culture_option.findByPk(id);
    if (!cultureOption) {
      return res.status(404).json({ error: 'Culture option not found' });
    }

    // Check if option already exists (excluding current option)
    const existingOption = await culture_option.findOne({
      where: {
        option: name.trim(),
        id: { [require('sequelize').Op.ne]: id }
      }
    });
    if (existingOption) {
      return res.status(400).json({ error: 'Culture option with this name already exists' });
    }

    await cultureOption.update({ option: name.trim() });
    res.json(cultureOption);
  } catch (error) {
    console.error('Error updating culture option:', error);
    res.status(500).json({ error: 'Failed to update culture option' });
  }
});

// DELETE - Delete culture option
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const cultureOption = await culture_option.findByPk(id);
    if (!cultureOption) {
      return res.status(404).json({ error: 'Culture option not found' });
    }

    await cultureOption.destroy();
    res.json({ message: 'Culture option deleted successfully' });
  } catch (error) {
    console.error('Error deleting culture option:', error);
    res.status(500).json({ error: 'Failed to delete culture option' });
  }
});

// GET all culture options with their sub-options
router.get("/with-suboptions", authenticateUser, authorizeRoles("admin", "chemist", "employee", "doctor"), async (req, res) => {
  try {
    const cultureOptions = await culture_option.findAll({
      include: [{
        model: culture_sub_option,
        as: 'subOptions',
        required: false,
        attributes: ['id', 'name', 'is_active'],
        paranoid: false
      }],
      order: [
        ['option', 'ASC'],
        [{ model: culture_sub_option, as: 'subOptions' }, 'name', 'ASC']
      ]
    });

    res.json(cultureOptions);
  } catch (error) {
    console.error('Error fetching culture options with sub-options:', error);
    res.status(500).json({ error: "Failed to fetch culture options with sub-options" });
  }
});

module.exports = router;
