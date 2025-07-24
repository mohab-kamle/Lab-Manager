const jwt = require('jsonwebtoken');
const { employee, admin, chemist, receptionist } = require('../models');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const isProd = process.env.NODE_ENV === 'production';

const authenticateUser = async (req, res, next) => {
    if (!isProd) {
      console.log('Authentication middleware - Headers:', {
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
          // Patients don't have lab_id in employee table, they have it in patient table
          // This will be handled separately in patient routes
          break;
        default:
          userRecord = await employee.findByPk(decoded.id);
      }
      
      // Add lab_id to user context if available
      if (userRecord && userRecord.lab_id) {
        req.user = { ...decoded, lab_id: userRecord.lab_id };
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