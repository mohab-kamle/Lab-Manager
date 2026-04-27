const express = require('express');
const router = express.Router();
const { employee } = require('../models');

const { tenantContext } = require('../middleware/tenantContext');

router.post('/', tenantContext, async (req, res) => {
  const { username, email } = req.body;
  const lab_id = req.tenant?.lab_id;

  try {
    const existingAdminByUsername = await employee.findOne({ 
      where: { username: username, role: 'admin', lab_id: lab_id }
    });

    if (existingAdminByUsername) {
      return res.json({ valid: false, message: 'Username already exists.' });
    }

    const existingAdminByEmail = await employee.findOne({
      where: { email: email, role: 'admin', lab_id: lab_id }
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