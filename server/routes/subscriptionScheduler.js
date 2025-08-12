const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { 
  checkAndUpdateExpiredSubscriptions, 
  checkAndUpdateExpiredTrials,
  getSchedulerStatus 
} = require('../services/subscriptionScheduler');
const { lab } = require('../models');
const { Op } = require('sequelize');

/**
 * Subscription Scheduler API Routes
 * 
 * These routes provide admin controls for the subscription scheduler
 * and allow manual checking of subscription statuses.
 */

/**
 * GET /subscription-scheduler/status
 * Get the current status of the subscription scheduler
 * Requires admin authentication
 */
router.get('/status', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const status = getSchedulerStatus();
    
    // Get some statistics about current subscriptions
    const subscriptionStats = await lab.findAll({
      attributes: [
        'subscription_status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['subscription_status'],
      raw: true
    });
    
    // Get subscriptions expiring soon (within next 7 days)
    const currentDate = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(currentDate.getDate() + 7);
    
    const expiringSoon = await lab.count({
      where: {
        subscription_status: 'active',
        subscription_end_date: {
          [Op.between]: [currentDate.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0]]
        }
      }
    });
    
    res.json({
      scheduler: status,
      statistics: {
        byStatus: subscriptionStats,
        expiringSoon: expiringSoon
      },
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

/**
 * POST /subscription-scheduler/check-now
 * Manually trigger a subscription check
 * Requires admin authentication
 */
router.post('/check-now', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    console.log(`🔄 Manual subscription check triggered by admin: ${req.user.name} (ID: ${req.user.id})`);
    
    // Run both checks
    await checkAndUpdateExpiredSubscriptions();
    await checkAndUpdateExpiredTrials();
    
    // Get updated statistics
    const subscriptionStats = await lab.findAll({
      attributes: [
        'subscription_status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['subscription_status'],
      raw: true
    });
    
    res.json({
      success: true,
      message: 'Subscription check completed successfully',
      checkedAt: new Date().toISOString(),
      statistics: {
        byStatus: subscriptionStats
      }
    });
  } catch (error) {
    console.error('Error during manual subscription check:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check subscriptions',
      message: error.message 
    });
  }
});

/**
 * GET /subscription-scheduler/expiring
 * Get list of subscriptions expiring soon
 * Requires admin authentication
 */
router.get('/expiring', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { days = 7 } = req.query; // Default to 7 days
    
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(currentDate.getDate() + parseInt(days));
    
    const expiring = await lab.findAll({
      where: {
        subscription_status: 'active',
        subscription_end_date: {
          [Op.between]: [currentDate.toISOString().split('T')[0], futureDate.toISOString().split('T')[0]]
        }
      },
      attributes: [
        'id', 
        'name', 
        'subscription_end_date', 
        'subscription_duration', 
        'subscription_amount',
        'lab_email',
        'lab_phone'
      ],
      order: [['subscription_end_date', 'ASC']]
    });
    
    res.json({
      expiring: expiring,
      count: expiring.length,
      daysAhead: parseInt(days),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting expiring subscriptions:', error);
    res.status(500).json({ error: 'Failed to get expiring subscriptions' });
  }
});

/**
 * GET /subscription-scheduler/expired
 * Get list of expired subscriptions
 * Requires admin authentication
 */
router.get('/expired', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const expired = await lab.findAndCountAll({
      where: {
        subscription_status: 'expired'
      },
      attributes: [
        'id', 
        'name', 
        'subscription_end_date', 
        'subscription_duration', 
        'subscription_amount',
        'lab_email',
        'lab_phone',
        'updated_at'
      ],
      order: [['subscription_end_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      expired: expired.rows,
      total: expired.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting expired subscriptions:', error);
    res.status(500).json({ error: 'Failed to get expired subscriptions' });
  }
});

/**
 * GET /subscription-scheduler/statistics
 * Get detailed subscription statistics
 * Requires admin authentication
 */
router.get('/statistics', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get subscription status distribution
    const statusStats = await lab.findAll({
      attributes: [
        'subscription_status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['subscription_status'],
      raw: true
    });
    
    // Get subscription duration distribution
    const durationStats = await lab.findAll({
      attributes: [
        'subscription_duration',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        subscription_status: 'active'
      },
      group: ['subscription_duration'],
      raw: true
    });
    
    // Get revenue statistics
    const revenueStats = await lab.findAll({
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('subscription_amount')), 'total_revenue'],
        [require('sequelize').fn('AVG', require('sequelize').col('subscription_amount')), 'average_revenue']
      ],
      where: {
        subscription_status: 'active'
      },
      raw: true
    });
    
    // Get expiring counts for different time periods
    const currentDate = new Date();
    const periods = [1, 7, 30, 90]; // days
    const expiringCounts = {};
    
    for (const days of periods) {
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + days);
      
      const count = await lab.count({
        where: {
          subscription_status: 'active',
          subscription_end_date: {
            [Op.between]: [currentDate.toISOString().split('T')[0], futureDate.toISOString().split('T')[0]]
          }
        }
      });
      
      expiringCounts[`next_${days}_days`] = count;
    }
    
    res.json({
      statusDistribution: statusStats,
      durationDistribution: durationStats,
      revenue: revenueStats[0] || { total_revenue: 0, average_revenue: 0 },
      expiringCounts: expiringCounts,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting subscription statistics:', error);
    res.status(500).json({ error: 'Failed to get subscription statistics' });
  }
});

module.exports = router;