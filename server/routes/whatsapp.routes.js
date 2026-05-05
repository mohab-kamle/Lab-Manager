const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const WhatsAppService = require('../services/whatsapp');
const qrcode = require('qrcode');

// Map to hold QR codes temporarily before they are scanned
const qrCodes = new Map();

// Endpoint to connect and get QR code (if applicable)
router.post('/connect/:labId', authenticateUser, async (req, res) => {
  const { labId } = req.params;
  
  // Basic authorization: ensure user belongs to this lab
  if (String(req.user.lab_id) !== String(labId)) {
    return res.status(403).json({ error: 'Unauthorized to configure WhatsApp for this lab' });
  }

  try {
    // Ensure a whatsapp account row exists for this lab so the session manager
    // can update its status during connection lifecycle events
    const db = require('../models');
    await db.lab_whatsapp_account.findOrCreate({
      where: { lab_id: labId, provider: 'web' },
      defaults: { status: 'disconnected' }
    });

    const onQrCallback = async (qr) => {
      // Convert raw QR string to base64 image
      const qrDataUrl = await qrcode.toDataURL(qr);
      qrCodes.set(labId, qrDataUrl);
      console.log(`[WhatsApp] QR code generated for lab ${labId}`);
    };

    const onConnectedCallback = () => {
      qrCodes.delete(labId); // clear QR code once connected
      console.log(`[WhatsApp] Lab ${labId} connected successfully`);
    };

    const onDisconnectedCallback = (willReconnect) => {
      if (!willReconnect) {
        qrCodes.delete(labId);
      }
      console.log(`[WhatsApp] Lab ${labId} disconnected. Will reconnect: ${willReconnect}`);
    };

    const result = await WhatsAppService.connect(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback);
    
    res.json({ message: 'Connection initiated', ...result });
  } catch (error) {
    console.error('WhatsApp Connect Error:', error);
    res.status(500).json({ error: 'Failed to initiate WhatsApp connection', details: error.message });
  }
});

// Endpoint to get the latest QR code (Client polls this if status is initializing)
router.get('/qr/:labId', authenticateUser, (req, res) => {
  const { labId } = req.params;
  
  if (String(req.user.lab_id) !== String(labId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const qrUrl = qrCodes.get(labId);
  if (qrUrl) {
    res.json({ qr: qrUrl });
  } else {
    res.json({ qr: null });
  }
});

// Endpoint to check connection status
router.get('/status/:labId', authenticateUser, async (req, res) => {
  const { labId } = req.params;
  
  if (String(req.user.lab_id) !== String(labId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const status = await WhatsAppService.getStatus(labId);
    res.json(status);
  } catch (error) {
    console.error('WhatsApp Status Error:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp status' });
  }
});

// Endpoint to send a report
router.post('/send-report', authenticateUser, async (req, res) => {
  const { patientId, reportId, phone, pdfBase64 } = req.body;
  const labId = req.user.lab_id; // Derived from authenticated user context
  
  if (!phone || !pdfBase64) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const db = require('../models');

    // Security: Validate that the report belongs to this lab
    if (reportId) {
      const report = await db.medical_report.findOne({
        where: { id: reportId, lab_id: labId },
        attributes: ['id']
      });
      if (!report) {
        return res.status(403).json({ error: 'Unauthorized: Report does not belong to your lab' });
      }
    }

    // Security: Validate that the patient belongs to this lab
    if (patientId) {
      const patient = await db.patient.findOne({
        where: { id: patientId, lab_id: labId },
        attributes: ['id']
      });
      if (!patient) {
        return res.status(403).json({ error: 'Unauthorized: Patient does not belong to your lab' });
      }
    }

    // Fetch the lab's custom message template for the PDF caption
    const account = await db.lab_whatsapp_account.findOne({
      where: { lab_id: labId, provider: 'web' },
      attributes: ['message_template']
    });

    // Build caption: replace {{lab_name}} placeholder with actual lab name
    let caption = account?.message_template || 'Here is your lab report.';
    const lab = await db.lab.findByPk(labId, { attributes: ['name'] });
    if (lab) {
      caption = caption.replace(/\{\{lab_name\}\}/g, lab.name);
    }
    // Replace {{patient_name}} if available
    if (patientId) {
      const patient = await db.patient.findByPk(patientId, { attributes: ['name'] });
      if (patient) {
        caption = caption.replace(/\{\{patient_name\}\}/g, patient.name);
      }
    }

    // Convert base64 back to buffer
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    const result = await WhatsAppService.sendReport(labId, patientId, phone, pdfBuffer, caption);

    // Increment whatsapp_sends counter on the medical report
    if (reportId) {
      try {
        await db.medical_report.increment('whatsapp_sends', {
          by: 1,
          where: { id: reportId, lab_id: labId } // Extra safety in where clause
        });
      } catch (incErr) {
        // Non-critical: log but don't fail the whole request
        console.error('Failed to increment whatsapp_sends:', incErr.message);
      }
    }

    res.json({ message: 'Report sent successfully', result });
  } catch (error) {
    console.error('WhatsApp Send Report Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send report' });
  }
});

// Admin disconnect
router.post('/disconnect/:labId', authenticateUser, async (req, res) => {
  const { labId } = req.params;
  
  if (String(req.user.lab_id) !== String(labId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const SessionManager = require('../services/whatsapp/sessionManager');
    await SessionManager.disconnectSession(labId);
    res.json({ message: 'Disconnected successfully' });
  } catch (error) {
    console.error('WhatsApp Disconnect Error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Get the lab's message template
router.get('/message-template/:labId', authenticateUser, async (req, res) => {
  const { labId } = req.params;

  if (String(req.user.lab_id) !== String(labId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const db = require('../models');
    const account = await db.lab_whatsapp_account.findOne({
      where: { lab_id: labId, provider: 'web' },
      attributes: ['message_template']
    });

    res.json({
      message_template: account?.message_template || 'Hello! Here is your lab report from {{lab_name}}. If you have any questions, please contact us.'
    });
  } catch (error) {
    console.error('Error fetching message template:', error);
    res.status(500).json({ error: 'Failed to fetch message template' });
  }
});

// Update the lab's message template
router.put('/message-template/:labId', authenticateUser, async (req, res) => {
  const { labId } = req.params;
  const { message_template } = req.body;

  if (String(req.user.lab_id) !== String(labId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (message_template === undefined || message_template === null) {
    return res.status(400).json({ error: 'message_template is required' });
  }

  try {
    const db = require('../models');
    const [updated] = await db.lab_whatsapp_account.update(
      { message_template },
      { where: { lab_id: labId, provider: 'web' } }
    );

    if (updated === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found for this lab. Connect WhatsApp first.' });
    }

    res.json({ message: 'Message template updated successfully', message_template });
  } catch (error) {
    console.error('Error updating message template:', error);
    res.status(500).json({ error: 'Failed to update message template' });
  }
});

module.exports = router;
