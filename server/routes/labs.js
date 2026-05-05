const express = require('express');
const router = express.Router();
const {
  lab,
  lab_settings: LabSettings,
  lab_activity_log: LabActivityLog,
  employee,
  patient,
  medical_report,
  bill,
  medical_report_has_test,
} = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const { tenantContext } = require('../middleware/tenantContext');
const authorizeRoles = require('../middleware/authorizeRoles');
const authorizeFileAccess = require('../middleware/authorizeFileAccess');
const path = require('path');
const { Op } = require('sequelize');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { s3ImageUpload, deleteOldS3Logo, getS3FileUrl } = require('../services/s3Service');

const normalizePhone = (phoneStr) => {
  if (!phoneStr) return null;
  try {
    const phoneNumber = parsePhoneNumberFromString(phoneStr);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
    return phoneStr;
  } catch (error) {
    return phoneStr;
  }
};

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
      attributes: ['id', 'name', 'lab_email', 'lab_address', 'lab_website', 'primary_color', 'secondary_color', 'logo_url'],
      include: [{ model: require('../models').phone_number, as: 'phones' }]
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

// Redirect lOGO IMAGES to S3 public URL
router.get('/branding/logos/:filename', authorizeFileAccess, async (req, res) => {
  try {
    const filename = req.params.filename;
    const s3Key = `public/logos/${filename}`;
    
    // For logos, which are in the public prefix, we can just redirect to the public URL
    const url = await getS3FileUrl(s3Key, true);
    res.redirect(302, url);
  } catch (error) {
    console.error('Error redirecting to logo:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
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
        },
        {
          model: require('../models').phone_number,
          as: 'phones'
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
        },
        {
          model: require('../models').phone_number,
          as: 'phones'
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
router.put('/:labId/settings', authenticateUser, authorizeRoles('admin'), (req, res, next) => {
  s3ImageUpload.single("logo")(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
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
router.put('/:labId', authenticateUser, authorizeRoles('admin'), s3ImageUpload.single("logo"), async (req, res) => {
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
          id: { [Op.ne]: parseInt(labId, 10) }
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

    const allowedFields = [
      'name',
      'region',
      'governorate',
      'license_number',
      'owner',
      'lab_email',
      'lab_phone',
      'lab_address',
      'lab_website',
      'primary_color',
      'secondary_color',
      'lab_name_invoice',
      'patient_due_limit'
    ];

    const sanitizedUpdate = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        const val = updateData[key];
        sanitizedUpdate[key] = typeof val === 'string' ? val.trim() : val;
      }
    }

    if (req.file) {
      const newFilename = path.basename(req.file.key);
      sanitizedUpdate.logo_url = `/labs/branding/logos/${newFilename}`;

      const previousUrl = labToUpdate.logo_url;
      if (previousUrl) {
        let oldFilename;
        if (previousUrl.includes('/branding/logos/')) {
          oldFilename = previousUrl.split('/').pop();
        } else {
          oldFilename = path.basename(previousUrl);
        }
        if (oldFilename && oldFilename !== newFilename) {
          await deleteOldS3Logo(previousUrl);
        }
      }
    }

    await labToUpdate.update(sanitizedUpdate);

    // Update phone numbers if provided
    if (updateData.phoneNumbers && Array.isArray(updateData.phoneNumbers)) {
      const { phone_number } = require('../models');
      
      // Delete existing lab phones
      await phone_number.destroy({
        where: { lab_id: labId }
      });

      // Add new phones
      if (updateData.phoneNumbers.length > 0) {
        const phonesToCreate = updateData.phoneNumbers
          .filter(p => p.phone && p.phone.trim() !== "")
          .map(p => ({
            phone: normalizePhone(p.phone.trim()),
            type: p.type || 'work',
            is_primary: p.is_primary || false,
            lab_id: labId
          }));
        
        if (phonesToCreate.length > 0) {
          await phone_number.bulkCreate(phonesToCreate);
        }
      }
    }

    // try {
    //   await LabActivityLog.create({
    //     lab_id: parseInt(labId),
    //     user_id: req.user.id,
    //     user_role: req.user.role,
    //     action: 'update_lab',
    //     entity_type: 'lab',
    //     entity_id: parseInt(labId),
    //     details: {
    //       fields_updated: Object.keys(sanitizedUpdate),
    //       logo_updated: !!req.file
    //     },
    //     ip_address: req.ip,
    //     user_agent: req.headers['user-agent']
    //   });
    // } catch (logError) {}

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

    // Calculate date range for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const [
      patientCount,
      reportCount,
      testCount,
      revenue,
      labInfo
    ] = await Promise.all([
      patient.count({ where: { lab_id: labId } }),
      medical_report.count({ where: { lab_id: labId } }),
      medical_report_has_test.count({
        include: [{
          model: medical_report,
          as: 'medical_report',
          where: { lab_id: labId },
          required: true
        }]
      }),
      bill.sum('total', {
        where: {
          lab_id: labId,
          date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        }
      }),
      lab.findByPk(labId, { attributes: ['subscription_status'] })
    ]);

    const isActive = (labInfo && (labInfo.subscription_status === 'active' || labInfo.subscription_status === 'trial')) ? 1 : 0;

    const stats = {
      totalPatients: patientCount,
      totalTests: testCount,
      totalReports: reportCount,
      monthlyRevenue: revenue || 0,
      activeSubscriptions: isActive
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
