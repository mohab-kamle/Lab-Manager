const jwt = require('jsonwebtoken');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;

const authenticateUser = (req, res, next) => {
    console.log('Authentication middleware - Headers:', {
      authorization: req.header("Authorization") ? 'Present' : 'Missing',
      origin: req.header("Origin"),
      method: req.method,
      path: req.path
    });
    
    const token = req.header("Authorization");
    if (!token) {
      console.log('Authentication failed: No token provided');
      return res.status(401).json({ error: "Access denied. No token provided." });
    }
    
    try {
      const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
      req.user = decoded; // { id, role }
      console.log('Authentication successful for user:', decoded.id, 'with role:', decoded.role);
      next();
    } catch (error) {
      console.log('Authentication failed: Invalid token -', error.message);
      res.status(400).json({ error: "Invalid token." });
    }
};
  

module.exports = authenticateUser;