const { lab, employee } = require('../models');

/**
 * Middleware to extract and validate tenant context from request
 * This middleware should be used after authentication to ensure the user belongs to the correct lab
 */
const tenantContext = async (req, res, next) => {
  try {
    // Get lab_id from user context (set during authentication)
    const userLabId = req.user?.lab_id;
    
    if (!userLabId) {
      return res.status(403).json({ 
        error: "Access denied. User not associated with any lab." 
      });
    }

    // Verify the lab exists and is active
    const labRecord = await lab.findByPk(userLabId);
    if (!labRecord) {
      return res.status(403).json({ 
        error: "Access denied. Lab not found." 
      });
    }

    if (labRecord.subscription_status !== 'active' && labRecord.subscription_status !== 'trial') {
      return res.status(403).json({ 
        error: "Access denied. Lab subscription is not active or on trial." 
      });
    }

    // Add lab context to request
    req.tenant = {
      lab_id: userLabId,
      lab: labRecord,
      subscription_duration: labRecord.subscription_duration,
      subscription_status: labRecord.subscription_status,
      subscription_end_date: labRecord.subscription_end_date
    };

    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Middleware to ensure data isolation by adding lab_id to query conditions
 * This middleware should be used before database queries
 */
const tenantIsolation = (req, res, next) => {
  // Add lab_id filter to all queries if not already present
  if (req.tenant && req.tenant.lab_id) {
    // Store the lab_id for use in route handlers
    req.labId = req.tenant.lab_id;
  }
  next();
};

/**
 * Helper function to add lab_id to query conditions
 */
const addLabFilter = (whereClause, labId) => {
  if (!whereClause) {
    return { lab_id: labId };
  }
  
  if (Array.isArray(whereClause)) {
    return [...whereClause, { lab_id: labId }];
  }
  
  return { ...whereClause, lab_id: labId };
};

/**
 * Helper function to validate if user belongs to the specified lab
 */
const validateLabAccess = async (userId, labId) => {
  try {
    const user = await employee.findByPk(userId);
    return user && user.lab_id === labId;
  } catch (error) {
    console.error('Lab access validation error:', error);
    return false;
  }
};

/**
 * Helper function to check lab subscription status
 */
const checkLabSubscription = async (labId) => {
  try {
    const labRecord = await lab.findByPk(labId);
    if (!labRecord) return false;

    // Check if subscription is active or on trial
    if (labRecord.subscription_status !== 'active' && labRecord.subscription_status !== 'trial') {
      return false;
    }

    // Check if subscription has expired
    if (labRecord.subscription_end_date && new Date() > new Date(labRecord.subscription_end_date)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Lab subscription check error:', error);
    return false;
  }
};

module.exports = {
  tenantContext,
  tenantIsolation,
  addLabFilter,
  validateLabAccess,
  checkLabSubscription
}; 