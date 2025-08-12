const express = require('express');
const router = express.Router();
const { employee } = require('../models');

router.post('/', async (req, res) => {
  const { username, email } = req.body;

  try {
    const existingAdminByUsername = await employee.findOne({ 
      where: { username: username, role: 'admin' }
    });

    if (existingAdminByUsername) {
      return res.json({ valid: false, message: 'Username already exists.' });
    }

    const existingAdminByEmail = await employee.findOne({
      where: { email: email, role: 'admin' }
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