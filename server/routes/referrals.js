const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

// Get all referrals
router.get('/', authenticateUser, authorizeRoles('admin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'doctor_name', sortOrder = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      is_active: true
    };

    if (search) {
      whereClause[Op.or] = [
        { doctor_name: { [Op.like]: `%${search}%` } },
        { specialization: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.referral.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.patient,
          as: 'patients',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    res.json({
      referrals: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCount: count
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single referral by ID
router.get('/:id', authenticateUser, authorizeRoles('admin', 'receptionist'), async (req, res) => {
  try {
    const referral = await db.referral.findByPk(req.params.id, {
      include: [
        {
          model: db.patient,
          as: 'patients',
          attributes: ['id', 'name', 'patientcode']
        }
      ]
    });

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json(referral);
  } catch (error) {
    console.error('Error fetching referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new referral
router.post('/', authenticateUser, authorizeRoles('admin', 'receptionist'), async (req, res) => {
  try {
    const { doctor_name, specialization, phone, email, address } = req.body;

    if (!doctor_name) {
      return res.status(400).json({ error: 'Doctor name is required' });
    }

    const referral = await db.referral.create({
      doctor_name,
      specialization,
      phone,
      email,
      address,
      is_active: true
    });

    res.status(201).json(referral);
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a referral
router.put('/:id', authenticateUser, authorizeRoles('admin', 'receptionist'), async (req, res) => {
  try {
    const { doctor_name, specialization, phone, email, address, is_active } = req.body;
    
    const referral = await db.referral.findByPk(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    await referral.update({
      doctor_name: doctor_name || referral.doctor_name,
      specialization: specialization !== undefined ? specialization : referral.specialization,
      phone: phone !== undefined ? phone : referral.phone,
      email: email !== undefined ? email : referral.email,
      address: address !== undefined ? address : referral.address,
      is_active: is_active !== undefined ? is_active : referral.is_active
    });

    res.json(referral);
  } catch (error) {
    console.error('Error updating referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete (soft delete) a referral
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const referral = await db.referral.findByPk(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    await referral.update({ is_active: false });
    res.json({ message: 'Referral deleted successfully' });
  } catch (error) {
    console.error('Error deleting referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;