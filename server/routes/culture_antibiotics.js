const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const db = require('../models');

// Get all antibiotics
router.get('/', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const antibiotics = await db.antibiotic.findAll({
      order: [['name', 'ASC']]
    });
    res.json(antibiotics);
  } catch (error) {
    console.error('Error fetching antibiotics:', error);
    res.status(500).json({ error: 'Failed to fetch antibiotics' });
  }
});

// Get antibiotics for a specific culture result
router.get('/culture/:cultureResultId', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const cultureAntibiotics = await db.medical_report_has_culture_antibiotic.findAll({
      where: { medical_report_has_culture_id: req.params.cultureResultId },
      include: [
        {
          model: db.antibiotic,
          as: 'antibiotic',
          attributes: ['id', 'name', 'shortcut', 'commercial_name']
        }
      ]
    });
    res.json(cultureAntibiotics);
  } catch (error) {
    console.error('Error fetching culture antibiotics:', error);
    res.status(500).json({ error: 'Failed to fetch culture antibiotics' });
  }
});

// Add or update antibiotic sensitivity for a culture
router.post('/culture/:cultureResultId', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const { antibiotic_id, sensitivity, zone_size } = req.body;
    const { cultureResultId } = req.params;

    if (!antibiotic_id || !sensitivity) {
      return res.status(400).json({ error: 'Antibiotic ID and sensitivity are required' });
    }

    if (!['sensitive', 'moderate', 'resistant'].includes(sensitivity)) {
      return res.status(400).json({ error: 'Invalid sensitivity value' });
    }

    // Validate zone_size if provided
    if (zone_size !== undefined && zone_size !== null && zone_size !== '') {
      const zoneNum = parseFloat(zone_size);
      if (isNaN(zoneNum) || zoneNum < 0 || zoneNum > 50) {
        return res.status(400).json({ error: 'Zone size must be a number between 0 and 50' });
      }
    }

    // Check if the culture result exists
    const cultureResult = await db.medical_report_has_culture.findByPk(cultureResultId);
    if (!cultureResult) {
      return res.status(404).json({ error: 'Culture result not found' });
    }

    // Check if the antibiotic exists
    const antibiotic = await db.antibiotic.findByPk(antibiotic_id);
    if (!antibiotic) {
      return res.status(404).json({ error: 'Antibiotic not found' });
    }

    // Try to find existing record
    const existingRecord = await db.medical_report_has_culture_antibiotic.findOne({
      where: {
        medical_report_has_culture_id: cultureResultId,
        antibiotic_id: antibiotic_id
      }
    });

    if (existingRecord) {
      // Update existing record
      await existingRecord.update({ 
        sensitivity,
        zone_size: zone_size !== undefined && zone_size !== null && zone_size !== '' ? parseFloat(zone_size) : null
      });
      res.json(existingRecord);
    } else {
      // Create new record
      const newRecord = await db.medical_report_has_culture_antibiotic.create({
        medical_report_has_culture_id: cultureResultId,
        antibiotic_id: antibiotic_id,
        sensitivity: sensitivity,
        zone_size: zone_size !== undefined && zone_size !== null && zone_size !== '' ? parseFloat(zone_size) : null
      });
      res.json(newRecord);
    }
  } catch (error) {
    console.error('Error saving culture antibiotic sensitivity:', error);
    res.status(500).json({ error: 'Failed to save culture antibiotic sensitivity' });
  }
});

// Delete antibiotic sensitivity for a culture
router.delete('/culture/:cultureResultId/antibiotic/:antibioticId', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const { cultureResultId, antibioticId } = req.params;

    const deleted = await db.medical_report_has_culture_antibiotic.destroy({
      where: {
        medical_report_has_culture_id: cultureResultId,
        antibiotic_id: antibioticId
      }
    });

    if (deleted) {
      res.json({ message: 'Antibiotic sensitivity deleted successfully' });
    } else {
      res.status(404).json({ error: 'Antibiotic sensitivity not found' });
    }
  } catch (error) {
    console.error('Error deleting culture antibiotic sensitivity:', error);
    res.status(500).json({ error: 'Failed to delete culture antibiotic sensitivity' });
  }
});

// Bulk update antibiotics for a culture
router.put('/culture/:cultureResultId/bulk', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const { cultureResultId } = req.params;
    const { antibiotics } = req.body; // Array of { antibiotic_id, sensitivity, zone_size }

    if (!Array.isArray(antibiotics)) {
      return res.status(400).json({ error: 'Antibiotics must be an array' });
    }

    // Check if the culture result exists
    const cultureResult = await db.medical_report_has_culture.findByPk(cultureResultId);
    if (!cultureResult) {
      return res.status(404).json({ error: 'Culture result not found' });
    }

    // Delete existing records for this culture
    await db.medical_report_has_culture_antibiotic.destroy({
      where: { medical_report_has_culture_id: cultureResultId }
    });

    // Create new records
    const newRecords = [];
    for (const item of antibiotics) {
      if (item.antibiotic_id && item.sensitivity) {
        // Validate zone_size if provided
        let zoneSize = null;
        if (item.zone_size !== undefined && item.zone_size !== null && item.zone_size !== '') {
          const zoneNum = parseFloat(item.zone_size);
          if (isNaN(zoneNum) || zoneNum < 0 || zoneNum > 50) {
            return res.status(400).json({ error: 'Zone size must be a number between 0 and 50' });
          }
          zoneSize = zoneNum;
        }

        const record = await db.medical_report_has_culture_antibiotic.create({
          medical_report_has_culture_id: cultureResultId,
          antibiotic_id: item.antibiotic_id,
          sensitivity: item.sensitivity,
          zone_size: zoneSize
        });
        newRecords.push(record);
      }
    }

    res.json(newRecords);
  } catch (error) {
    console.error('Error bulk updating culture antibiotics:', error);
    res.status(500).json({ error: 'Failed to bulk update culture antibiotics' });
  }
});

module.exports = router; 