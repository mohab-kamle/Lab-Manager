const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');
const db = require('../models');
const { Op } = require('sequelize');

// GET /analytics/tat
router.get(
  '/tat',
  authenticateUser,
  authorizeRoles(['admin', 'doctor', 'chemist']),
  tenantContext,
  async (req, res) => {
    try {
      const lab_id = req.tenant.lab_id;
      let { startDate, endDate } = req.query;

      const whereClause = { lab_id };

      // Handle optional date filtering
      if (startDate && endDate) {
        // Parse dates safely
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Check if dates are valid
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          // Make sure end date includes the whole day
          end.setUTCHours(23, 59, 59, 999);
          whereClause.registered_at = {
            [Op.between]: [start, end],
          };
        }
      }

      // Fetch all reports matching the criteria (instead of doing complex db aggregation which might fail due to strict SQL modes)
      const reports = await db.medical_report.findAll({
        attributes: [
          'id',
          'registered_at',
          'collected_at',
          'received_at',
          'reported_at'
        ],
        where: whereClause,
        raw: true,
      });

      // Compute metrics in memory (safe and robust for missing/null dates)
      let totalTatMinutes = 0;
      let collectionTimeMinutes = 0;
      let transitTimeMinutes = 0;
      let processingTimeMinutes = 0;

      let completedCount = 0;
      let pendingCount = 0;

      let tatCount = 0;
      let collectionCount = 0;
      let transitCount = 0;
      let processingCount = 0;

      const delayedReports = [];
      const now = new Date();

      reports.forEach(r => {
        if (r.reported_at) {
          completedCount++;
          // Registered to Reported
          if (r.registered_at) {
            const tat = (new Date(r.reported_at) - new Date(r.registered_at)) / 60000;
            totalTatMinutes += tat;
            tatCount++;
          }
          // Received to Reported
          if (r.received_at) {
            const proc = (new Date(r.reported_at) - new Date(r.received_at)) / 60000;
            processingTimeMinutes += proc;
            processingCount++;
          }
        } else {
          pendingCount++;
          // If reported_at is null but registered > 24 hours ago, it's delayed
          if (r.registered_at) {
            const hoursSinceReg = (now - new Date(r.registered_at)) / (1000 * 60 * 60);
            if (hoursSinceReg > 24) {
              delayedReports.push(r.id);
            }
          }
        }

        // Registered to Collected
        if (r.registered_at && r.collected_at) {
          const coll = (new Date(r.collected_at) - new Date(r.registered_at)) / 60000;
          collectionTimeMinutes += coll;
          collectionCount++;
        }

        // Collected to Received
        if (r.collected_at && r.received_at) {
          const trans = (new Date(r.received_at) - new Date(r.collected_at)) / 60000;
          transitTimeMinutes += trans;
          transitCount++;
        }
      });

      // Calculate averages
      const metrics = {
        avg_total_tat_minutes: tatCount > 0 ? (totalTatMinutes / tatCount) : 0,
        avg_collection_time_minutes: collectionCount > 0 ? (collectionTimeMinutes / collectionCount) : 0,
        avg_transit_time_minutes: transitCount > 0 ? (transitTimeMinutes / transitCount) : 0,
        avg_processing_time_minutes: processingCount > 0 ? (processingTimeMinutes / processingCount) : 0,
        completed_count: completedCount,
        pending_count: pendingCount,
      };

      // Fetch full details for delayed reports (limit to 50 to avoid huge payloads)
      let fullDelayedReports = [];
      if (delayedReports.length > 0) {
        fullDelayedReports = await db.medical_report.findAll({
          where: {
            id: { [Op.in]: delayedReports.slice(0, 50) }
          },
          include: [
            {
              model: db.patient,
              as: 'patient',
              attributes: ['id', 'name', 'phone']
            }
          ],
          order: [['registered_at', 'ASC']]
        });
      }

      res.json({
        success: true,
        metrics,
        delayedReports: fullDelayedReports
      });
    } catch (error) {
      console.error('Error fetching TAT analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
);

module.exports = router;
