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
const fs = require('fs');
const multer = require("multer");
const { Op } = require('sequelize');
const crypto = require('crypto');



// Multer configuration for secure image uploads
const BASE_UPLOAD_PATH = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../uploads');
const LOGO_UPLOAD_PATH = path.join(BASE_UPLOAD_PATH, 'shared', 'logos');

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(LOGO_UPLOAD_PATH)) {
      fs.mkdirSync(LOGO_UPLOAD_PATH, { recursive: true });
    }
    cb(null, LOGO_UPLOAD_PATH);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const labId = req.params.labId || (req.user && req.user.lab_id) || 'lab';
    const unique = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${labId}_${unique}_${base}${ext}`);
  }
});


const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

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

// Serve lOGO IMAGES with authentication
router.get('/branding/logos/:filename', authorizeFileAccess, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(LOGO_UPLOAD_PATH, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Set appropriate headers for images
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

  res.sendFile(filePath);
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
router.put('/:labId/settings', authenticateUser, authorizeRoles('admin'), (req, res, next) => {
  imageUpload.single("logo")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
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
router.put('/:labId', authenticateUser, authorizeRoles('admin'), imageUpload.single("logo"), async (req, res) => {
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
      const newFilename = path.basename(req.file.filename);
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
          const oldPath = path.join(LOGO_UPLOAD_PATH, oldFilename);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (e) {
              console.warn('Failed to delete old logo:', oldPath, e.message);
            }
          }
        }
      }
    }

    await labToUpdate.update(sanitizedUpdate);

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
