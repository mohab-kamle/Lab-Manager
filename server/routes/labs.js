const express = require('express');
const router = express.Router();
const { lab, lab_settings: LabSettings, lab_activity_log: LabActivityLog, employee } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const { tenantContext } = require('../middleware/tenantContext');
const authorizeRoles = require('../middleware/authorizeRoles');

// List labs (optionally filter by owner_id)
router.get('/', authenticateUser, async (req, res) => {
  try {
    const where = {};
    // Restrict to labs owned by the user unless they have a super role
    if (req.user && req.user.role !== 'super') {
      where.owner_id = req.user.id;
    }
    const labsList = await lab.findAll({ where, order: [['name', 'ASC']] });
    res.json(labsList);
  } catch (err) {
    console.error('Error fetching labs list:', err);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
});

// Get lab branding info for medical reports/invoices 
router.get('/branding', authenticateUser, tenantContext, async (req, res) => {
    try {
    //Get lab branding-specific fields/properties using lab_id
    const labBrandingInfo = await lab.findByPk(req.tenant.lab_id, {
      attributes: ['name', 'lab_email', 'lab_address', 'lab_website', 'primary_color', 'secondary_color', 'logo_url']
    });
    //Check if there's any lab with such id
    if (!labBrandingInfo) {
      return res.status(404).json({ error: 'Lab not found' });
    }
    //Respond With these exact same data
    res.json(labBrandingInfo);
  } catch (err) {
    console.error('Error fetching lab branding info:', err);
    res.status(500).json({ error: 'Failed to fetch lab branding info' });
  }
});

// Get lab by path (for multi-tenant routing)
router.get('/by-path/:path', async (req, res) => {
  try {
    const { path } = req.params;
    
    // Use subdomain as the path and subscription_status as active
    const labResult = await lab.findOne({
      where: { subdomain: path, subscription_status: 'active' },
      include: [
        {
          model: employee,
          as: 'employees',
          where: { role: 'admin' },
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        }
      ]
    });

    if (!labResult) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    res.json(labResult);
  } catch (error) {
    console.error('Error fetching lab by path:', error);
    res.status(500).json({ error: 'Failed to fetch lab information' });
  }
});

// Get lab by numeric ID (for authenticated dashboard usage)
router.get('/by-id/:labId', async (req, res) => {
  try {
    const { labId } = req.params;

    const labResult = await lab.findByPk(labId, {
      include: [
        {
          model: employee,
          as: 'employees',
          where: { role: 'admin' },
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        }
      ]
    });

    if (!labResult) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    res.json(labResult);
  } catch (error) {
    console.error('Error fetching lab by ID:', error);
    res.status(500).json({ error: 'Failed to fetch lab information' });
  }
});

// Get lab settings
router.get('/:labId/settings', async (req, res) => {
  try {
    const { labId } = req.params;
    
    const settings = await LabSettings.findAll({
      where: { lab_id: labId },
      order: [['setting_key', 'ASC']]
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching lab settings:', error);
    res.status(500).json({ error: 'Failed to fetch lab settings' });
  }
});

// Update lab settings
router.put('/:labId/settings', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { labId } = req.params;
    const { settings } = req.body;

    // Verify user belongs to this lab
    if (req.user.lab_id !== parseInt(labId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    for (const setting of settings) {
      // Upsert will either insert a new record if it doesn't exist,
      // or update the existing record if one is found with matching lab_id and setting_key
      await LabSettings.upsert({
        lab_id: labId,
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        setting_type: setting.setting_type
      });
    }
    // Fetch updated settings
    const updatedSettings = await LabSettings.findAll({
      where: { lab_id: labId },
      order: [['setting_key', 'ASC']]
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating lab settings:', error);
    res.status(500).json({ error: 'Failed to update lab settings' });
  }
});

// Update lab information
router.put('/:labId', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { labId } = req.params;
    const updateData = req.body;

    // Verify user belongs to this lab
    if (req.user.lab_id !== parseInt(labId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if lab name is being changed and if it's unique
    if (updateData.name) {
      const existingLab = await lab.findOne({
        where: { 
          name: updateData.name,
          id: { [require('sequelize').Op.ne]: labId }
        }
      });
      
      if (existingLab) {
        return res.status(400).json({ error: 'Lab name already exists' });
      }
    }

    // Update lab
    //change name of the object to not conflict with the lab model
    const labToUpdate = await lab.findByPk(labId);
    if (!labToUpdate) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    await labToUpdate.update(updateData);

    res.json(labToUpdate);
  } catch (error) {
    console.error('Error updating lab:', error);
    res.status(500).json({ error: 'Failed to update lab information' });
  }
});

// Get subscription status
router.get('/:labId/subscription', async (req, res) => {
  try {
    const { labId } = req.params;
    
    const lab = await lab.findByPk(labId, {
      attributes: ['id', 'subscription_status', 'trial_expires_at', 'is_active']
    });

    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const subscriptionStatus = {
      status: lab.subscription_status,
      trialExpiresAt: lab.trial_expires_at,
      isTrialExpired: lab.trial_expires_at ? new Date(lab.trial_expires_at) < new Date() : false,
      isActive: lab.is_active
    };

    res.json(subscriptionStatus);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Upgrade subscription after successful payment
router.post('/:labId/upgrade', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { labId } = req.params;
    const { plan, paymentMethod, merchant_order_id } = req.body;

    // Verify user belongs to this lab
    if (req.user.lab_id !== parseInt(labId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const labRecord = await lab.findByPk(labId);
    if (!labRecord) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    // If merchant_order_id is provided, verify payment was successful and get payment amount
    let paymentAmount = 0;
    if (merchant_order_id) {
      const { lab_payment } = require('../models');
      const payment = await lab_payment.findOne({
        where: { 
          merchant_order_id: merchant_order_id,
          lab_id: labId,
          payment_status: 'paid',
          confirmed: true
        }
      });
      
      if (!payment) {
        return res.status(400).json({ error: 'Payment not found or not confirmed' });
      }
      
      // Get the payment amount from the payment record
      paymentAmount = payment.amount || 0;
    }

    // Calculate subscription dates based on plan
    const startDate = new Date();
    let endDate = new Date();
    
    switch (plan) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '3_months':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case '6_months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
    }

    // Update subscription status and amount
    await labRecord.update({
      subscription_status: 'active',
      subscription_start_date: startDate.toISOString().split('T')[0],
      subscription_end_date: endDate.toISOString().split('T')[0],
      subscription_duration: plan,
      subscription_amount: paymentAmount,
      trial_expires_at: null
    });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      subscription: {
        status: 'active',
        plan: plan,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Get lab statistics
router.get('/:labId/stats', authenticateUser, async (req, res) => {
  try {
    const { labId } = req.params;
    
    // Verify user belongs to this lab
    if (req.user.lab_id !== parseInt(labId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Add actual statistics queries
    const stats = {
      totalPatients: 0,
      totalTests: 0,
      totalReports: 0,
      monthlyRevenue: 0,
      activeSubscriptions: 1
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching lab stats:', error);
    res.status(500).json({ error: 'Failed to fetch lab statistics' });
  }
});

// Get activity log
router.get('/:labId/activity-log', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { labId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    // Verify user belongs to this lab
    if (req.user.lab_id !== parseInt(labId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await LabActivityLog.findAndCountAll({
      where: { lab_id: labId },
      order: [['created_at', 'DESC']],
      offset: Number(offset),
      limit: Number(pageSize)
    });

    res.json({
      data: rows,
      page: Number(page),
      pageSize: Number(pageSize),
      total: count
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

module.exports = router;