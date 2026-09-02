const express = require('express');
const router = express.Router();
const { employee } = require('../models');

const { tenantContext } = require('../middleware/tenantContext');

router.post('/', tenantContext, async (req, res) => {
  const { username, email } = req.body;

  if (username && typeof username !== 'string') {
    return res.status(400).json({ valid: false, message: 'Invalid username format.' });
  }

  if (email && typeof email !== 'string') {
    return res.status(400).json({ valid: false, message: 'Invalid email format.' });
  }

  try {
    const existingAdminByUsername = await employee.findOne({ 
      where: { username: username }
    });

    if (existingAdminByUsername) {
      return res.json({ valid: false, message: 'Username already exists.' });
    }

    const existingAdminByEmail = await employee.findOne({
      where: { email: email }
    });

    if (existingAdminByEmail) {
      return res.json({ valid: false, message: 'Email already exists.' });
    }

    return res.json({ valid: true, message: 'Username and email are available.' });
  } catch (error) {
    console.error('Error validating admin info:', error);
    return res.status(500).json({ error: 'Server error during validation.' });
  }
});

module.exports = router;