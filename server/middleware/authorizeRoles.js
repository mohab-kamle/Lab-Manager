const jwt = require('jsonwebtoken');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('Authorization check - User:', req.user ? req.user.id : 'No user', 'Role:', req.user ? req.user.role : 'No role', 'Allowed roles:', allowedRoles);
    
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log('Access denied for role:', req.user && req.user.role, 'Allowed roles:', allowedRoles);
      return res.status(403).json({ error: "Access denied." });
    }
    
    console.log('Authorization successful for role:', req.user.role);
    next();
  };
}
  
module.exports = authorizeRoles;