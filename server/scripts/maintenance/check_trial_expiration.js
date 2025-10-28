const { lab, lab_activity_log } = require('../models');
const { Op } = require('sequelize');

/**
 * Check and handle trial expiration
 * This script should be run daily via cron job
 */
async function checkTrialExpiration() {
  try {
    console.log('Checking trial expiration...');
    
    // Find labs with expired trials
    const expiredTrials = await lab.findAll({
      where: {
        subscription_status: 'trial',
        subscription_end_date: {
          [Op.lt]: new Date() // Less than current date
        }
      }
    });

    console.log(`Found ${expiredTrials.length} expired trials`);

    for (const labRecord of expiredTrials) {
      try {
        // Update lab status to expired
        await labRecord.update({
          subscription_status: 'expired'
        });

        // Log the expiration
        await lab_activity_log.create({
          lab_id: labRecord.id,
          action: 'trial_expired',
          entity_type: 'lab',
          entity_id: labRecord.id,
          details: {
            previous_status: 'trial',
            new_status: 'expired',
            expired_date: new Date()
          }
        });

        console.log(`✓ Marked lab ${labRecord.id} (${labRecord.name}) as expired`);
      } catch (error) {
        console.error(`✗ Error updating lab ${labRecord.id}:`, error.message);
      }
    }

    // Find labs with trials expiring soon (within 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await lab.findAll({
      where: {
        subscription_status: 'trial',
        subscription_end_date: {
          [Op.between]: [new Date(), threeDaysFromNow]
        }
      }
    });

    console.log(`Found ${expiringSoon.length} trials expiring soon`);

    for (const labRecord of expiringSoon) {
      try {
        // Log the upcoming expiration (for notification purposes)
        await lab_activity_log.create({
          lab_id: labRecord.id,
          action: 'trial_expiring_soon',
          entity_type: 'lab',
          entity_id: labRecord.id,
          details: {
            days_remaining: Math.ceil((new Date(labRecord.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))
          }
        });

        console.log(`✓ Logged upcoming expiration for lab ${labRecord.id} (${labRecord.name})`);
      } catch (error) {
        console.error(`✗ Error logging expiration for lab ${labRecord.id}:`, error.message);
      }
    }

    console.log('Trial expiration check completed successfully!');
    
  } catch (error) {
    console.error('Trial expiration check failed:', error);
  }
}

/**
 * Get trial statistics
 */
async function getTrialStatistics() {
  try {
    const stats = await lab.findAll({
      attributes: [
        'subscription_status',
        [lab.sequelize.fn('COUNT', lab.sequelize.col('id')), 'count']
      ],
      group: ['subscription_status'],
      raw: true
    });

    console.log('Trial Statistics:');
    stats.forEach(stat => {
      console.log(`${stat.subscription_status}: ${stat.count} labs`);
    });

    return stats;
  } catch (error) {
    console.error('Error getting trial statistics:', error);
    return [];
  }
}

/**
 * Extend trial for a specific lab
 */
async function extendTrial(labId, additionalDays = 7) {
  try {
    const labRecord = await lab.findByPk(labId);
    if (!labRecord) {
      console.error(`Lab ${labId} not found`);
      return false;
    }

    if (labRecord.subscription_status !== 'trial') {
      console.error(`Lab ${labId} is not on trial`);
      return false;
    }

    const newEndDate = new Date(labRecord.subscription_end_date);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    await labRecord.update({
      subscription_end_date: newEndDate
    });

    // Log the extension
    await lab_activity_log.create({
      lab_id: labId,
      action: 'trial_extended',
      entity_type: 'lab',
      entity_id: labId,
      details: {
        additional_days: additionalDays,
        new_end_date: newEndDate
      }
    });

    console.log(`✓ Extended trial for lab ${labId} by ${additionalDays} days`);
    return true;
  } catch (error) {
    console.error(`✗ Error extending trial for lab ${labId}:`, error.message);
    return false;
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkTrialExpiration();
      break;
    case 'stats':
      getTrialStatistics();
      break;
    case 'extend':
      const labId = process.argv[3];
      const days = process.argv[4] || 7;
      if (labId) {
        extendTrial(parseInt(labId), parseInt(days));
      } else {
        console.log('Usage: node check_trial_expiration.js extend <lab_id> [days]');
      }
      break;
    default:
      console.log('Usage:');
      console.log('  node check_trial_expiration.js check    - Check and handle expired trials');
      console.log('  node check_trial_expiration.js stats    - Get trial statistics');
      console.log('  node check_trial_expiration.js extend <lab_id> [days] - Extend trial for specific lab');
  }
}

module.exports = {
  checkTrialExpiration,
  getTrialStatistics,
  extendTrial
}; 