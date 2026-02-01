const { lab, employee } = require('../models');

/**
 * Middleware to extract and validate tenant context from request
 * This middleware should be used after authentication to ensure the user belongs to the correct lab
 */
const tenantContext = async (req, res, next) => {
  try {
    // 1. Extract Subdomain
    const host = req.headers.host;
    // Handle localhost port numbers if present (e.g. biolab.localhost:3000)
    const hostname = host.split(':')[0];
    const subdomain = hostname.split('.')[0];

    // Debug log
    // console.log(`🔍 Tenant Context: host=${host}, subdomain=${subdomain}`);

    // 2. Attach Context (Initialize early)
    req.tenantId = subdomain;
    req.tenant = {
      id: subdomain,
      subdomain: subdomain
    };

    // 3. Populate Lab ID from User Context (if authenticated)
    if (req.user && req.user.lab_id) {
      req.tenant.lab_id = req.user.lab_id;
    }

    // 4. Allow System/Public Domains (Bypass strict subdomain checks)
    if (['www', 'api', 'localhost', '127'].includes(subdomain)) {
      // Even on localhost, we might need a lab_id if it wasn't in the user context (e.g. public pages)
      // But usually for localhost dev, relying on req.user.lab_id is sufficient.
      return next();
    }

    // 5. Security Check (If User is Logged In)
    if (req.user && req.user.lab_id) {
      const userLab = await lab.findByPk(req.user.lab_id);

      // If the user's lab subdomain doesn't match the URL, BLOCK THEM.
      if (userLab && userLab.subdomain !== subdomain) {
        return res.status(403).json({
          error: "Workspace Mismatch",
          message: `You are logged in to ${userLab.subdomain} but trying to access ${subdomain}.`
        });
      }
    }

    // 6. Public/Unauthenticated Tenant Lookup
    // If we haven't identified a lab yet (not logged in, or logged in but no lab_id ?), 
    // try to find the lab by subdomain.
    if (!req.tenant.lab_id) {
      const tenantLab = await lab.findOne({ where: { subdomain: subdomain } });
      if (tenantLab) {
        req.tenant.lab_id = tenantLab.id;
      }
    }

    next();
  } catch (error) {
    console.error("Tenant Context Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Middleware to ensure data isolation by adding lab_id to query conditions
 * This middleware should be used before database queries
 */
const tenantIsolation = (req, res, next) => {
  // 1. Try to get labId from the populated tenant object (if available)
  if (req.tenant && req.tenant.lab_id) {
    req.labId = req.tenant.lab_id;
  }
  // 2. Fallback: If user is authenticated, use their lab_id
  else if (req.user && req.user.lab_id) {
    req.labId = req.user.lab_id;
  }

  // Debug log to help trace issues
  if (!req.labId) {
    console.warn('Warning: No labId found in tenantIsolation context');
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