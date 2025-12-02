const jwt = require('jsonwebtoken');
require("dotenv").config();
const { medical_report, employee} = require('../models');
const SECRET_KEY = process.env.SECRET_KEY;


// File access authorization middleware
const authorizeFileAccess = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, SECRET_KEY/*process.env.JWT_SECRET*/);
    
    // Add user info to request
    req.user = decoded;
    
    // For comment images, check if user has access to the related medical report
    if (req.path.includes('/comment-images/')) {
      const filename = req.params.filename;
      
      // Extract report ID from filename if it follows naming convention
      // Format: reportId_commentType_timestamp_originalName
      const reportIdMatch = filename.match(/^(\d+)_/);
      if (reportIdMatch) {
        const reportId = reportIdMatch[1];
        
        // Check if user has access to this medical report
        const report = await medical_report.findByPk(reportId);
        
        if (!report) {
          return res.status(404).json({ error: 'Medical report not found' });
        }
        
        // Check user permissions based on role
        if (req.user.role === 'patient') {
          // Patients can only access their own reports
          if (report.patient_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to this file' });
          }
        } else if (['chemist', 'receptionist', 'admin'].includes(req.user.role)) {
          // Staff can access reports from their lab
          const emp = await employee.findByPk(req.user.id);
          if (!emp || emp.lab_id !== report.lab_id) {
            return res.status(403).json({ error: 'Access denied to this file' });
          }
        } else {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }
    }
    

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('File access authorization error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authorizeFileAccess;
