const express = require('express');
const router = express.Router();
require("dotenv").config();
const { bill } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

// Get total revenue
router.get('/revenue', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await bill.findAll({ 
      attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'totalRevenue']] 
    });
    const totalRevenue = result[0].get('totalRevenue') || 0;
    res.json({ totalRevenue });
  } catch (error) {
    console.error('Error getting revenue:', error);
    res.status(500).json({ error: 'Failed to get revenue' });
  }
}); 

module.exports = router; 