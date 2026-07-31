const jwt = require('jsonwebtoken');
const { employee, admin, chemist, receptionist, patient, lab, doctor } = require('../models');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const isProd = process.env.NODE_ENV === 'production';

const authenticateUser = async (req, res, next) => {
  // ... (logging remains)
  if (!isProd) {
    console.log('Authentication middleware (Updated) - Headers:', {
      authorization: req.header("Authorization") ? 'Present' : 'Missing',
      origin: req.header("Origin"),
      method: req.method,
      path: req.path
    });
  }

  const token = req.header("Authorization");
  if (!token) {
    if (!isProd) console.log('Authentication failed: No token provided');
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);

    // For multi-tenant system, we need to get the user's lab_id from the database
    // since it might not be stored in the JWT token for security reasons
    let userRecord;

    switch (decoded.role) {
      case 'admin':
        userRecord = await admin.findByPk(decoded.id, {
          include: [{ model: employee, as: 'id_employee' }]
        });
        break;
      case 'chemist':
        userRecord = await chemist.findByPk(decoded.id, {
          include: [{ model: employee, as: 'id_employee' }]
        });
        break;
      case 'receptionist':
        userRecord = await receptionist.findByPk(decoded.id, {
          include: [{ model: employee, as: 'id_employee' }]
        });
        break;
      case 'patient':
        userRecord = await patient.findByPk(decoded.id, {
          include: [{ model: lab, as: 'lab' }]
        });
        break;
      case 'doctor':
        userRecord = await doctor.findByPk(decoded.id);
        break;
      default:
        userRecord = await employee.findByPk(decoded.id);
    }

    // Security enhancement: if the user record is not found in the DB,
    // it means the user was deleted, but their JWT is still active.
    // They should not be allowed to access the system.
    if (!userRecord) {
      if (!isProd) console.log(`Authentication failed: User ${decoded.id} with role ${decoded.role} not found in database.`);
      return res.status(401).json({ error: "Access denied. User no longer exists." });
    }

    // Add lab_id to user context if available
    let labId;

    if (userRecord) {
      // Direct handling for roles linked to employee
      if (['admin', 'chemist', 'receptionist'].includes(decoded.role) && userRecord.id_employee) {
        labId = userRecord.id_employee.lab_id;
      } else if (userRecord.lab_id) {
        // Direct handling for patient/employee
        labId = userRecord.lab_id;
      }
    }

    if (labId) {
      req.user = { ...decoded, lab_id: labId };
    } else {
      req.user = decoded;
    }

    if (!isProd) console.log('Authentication successful for user:', decoded.id, 'with role:', decoded.role, 'lab_id:', req.user.lab_id);
    next();
  } catch (error) {
    if (!isProd) console.log('Authentication failed: Invalid token -', error.message);
    res.status(400).json({ error: "Invalid token." });
  }
};


module.exports = authenticateUser;