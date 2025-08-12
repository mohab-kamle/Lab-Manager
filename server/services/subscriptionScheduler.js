const cron = require('node-cron');
const { lab } = require('../models');
const { Op } = require('sequelize');

/**
 * Subscription Scheduler Service
 * 
 * This service runs a scheduled job every 3 hours to check for expired subscriptions
 * and automatically update their status to 'expired'. This ensures that subscription
 * status is always up-to-date without requiring manual intervention.
 * 
 * Schedule: Every 3 hours (0 star/3 star star star star)
 * - Runs at: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
 */

/**
 * Check and update expired subscriptions
 * This function finds all labs with active subscriptions that have passed their end date
 * and updates their status to 'expired'
 */
async function checkAndUpdateExpiredSubscriptions() {
  try {
    console.log('🔍 Checking for expired subscriptions...');
    
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Find all labs with active subscriptions that have expired
    const expiredLabs = await lab.findAll({
      where: {
        subscription_status: 'active',
        subscription_end_date: {
          [Op.lt]: currentDateString // subscription_end_date < current_date
        }
      },
      attributes: ['id', 'name', 'subscription_end_date', 'subscription_duration', 'subscription_amount']
    });
    
    if (expiredLabs.length === 0) {
      console.log('✅ No expired subscriptions found.');
      return;
    }
    
    console.log(`⚠️  Found ${expiredLabs.length} expired subscription(s):`);
    
    // Update expired subscriptions
    const updateResult = await lab.update(
      { 
        subscription_status: 'expired'
      },
      {
        where: {
          subscription_status: 'active',
          subscription_end_date: {
            [Op.lt]: currentDateString
          }
        }
      }
    );
    
    // Log details of expired subscriptions
    expiredLabs.forEach(expiredLab => {
      console.log(`   - Lab: ${expiredLab.name} (ID: ${expiredLab.id})`);
      console.log(`     Expired on: ${expiredLab.subscription_end_date}`);
      console.log(`     Plan: ${expiredLab.subscription_duration}`);
      console.log(`     Amount: $${expiredLab.subscription_amount}`);
    });
    
    console.log(`✅ Successfully updated ${updateResult[0]} subscription(s) to expired status.`);
    
    // Optional: Log activity for audit purposes
    await logSubscriptionActivity(expiredLabs);
    
  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error);
    // Don't throw the error to prevent the cron job from stopping
  }
}

/**
 * Log subscription expiration activity for audit purposes
 * This helps track when subscriptions were automatically expired
 */
async function logSubscriptionActivity(expiredLabs) {
  try {
    // Check if lab_activity_log model exists
    const { lab_activity_log } = require('../models');
    
    if (lab_activity_log) {
      const activityLogs = expiredLabs.map(expiredLab => ({
        lab_id: expiredLab.id,
        activity_type: 'subscription_expired',
        description: `Subscription automatically expired on ${expiredLab.subscription_end_date}`,
        performed_by: 'system',
        created_at: new Date()
      }));
      
      await lab_activity_log.bulkCreate(activityLogs);
      console.log(`📝 Logged ${activityLogs.length} subscription expiration activities.`);
    }
  } catch (error) {
    // If logging fails, don't stop the main process
    console.log('⚠️  Could not log subscription activities (this is optional):', error.message);
  }
}

/**
 * Check and update expired trial subscriptions
 * This function specifically handles trial subscriptions that have expired
 */
async function checkAndUpdateExpiredTrials() {
  try {
    console.log('🔍 Checking for expired trial subscriptions...');
    
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split('T')[0];
    
    // Find all labs with trial subscriptions that have expired
    const expiredTrials = await lab.findAll({
      where: {
        subscription_status: 'trial',
        [Op.or]: [
          {
            trial_expires_at: {
              [Op.lt]: currentDateString
            }
          },
          {
            subscription_end_date: {
              [Op.lt]: currentDateString
            }
          }
        ]
      },
      attributes: ['id', 'name', 'trial_expires_at', 'subscription_end_date']
    });
    
    if (expiredTrials.length === 0) {
      console.log('✅ No expired trial subscriptions found.');
      return;
    }
    
    console.log(`⚠️  Found ${expiredTrials.length} expired trial subscription(s):`);
    
    // Update expired trial subscriptions
    const updateResult = await lab.update(
      { 
        subscription_status: 'expired'
      },
      {
        where: {
          subscription_status: 'trial',
          [Op.or]: [
            {
              trial_expires_at: {
                [Op.lt]: currentDateString
              }
            },
            {
              subscription_end_date: {
                [Op.lt]: currentDateString
              }
            }
          ]
        }
      }
    );
    
    // Log details of expired trials
    expiredTrials.forEach(expiredTrial => {
      console.log(`   - Lab: ${expiredTrial.name} (ID: ${expiredTrial.id})`);
      console.log(`     Trial expired on: ${expiredTrial.trial_expires_at || expiredTrial.subscription_end_date}`);
    });
    
    console.log(`✅ Successfully updated ${updateResult[0]} trial subscription(s) to expired status.`);
    
  } catch (error) {
    console.error('❌ Error checking expired trial subscriptions:', error);
  }
}

/**
 * Initialize the subscription scheduler
 * Sets up the cron job to run every 3 hours
 */
function initializeSubscriptionScheduler() {
  console.log('🚀 Initializing subscription scheduler...');
  
  // Schedule the job to run every 3 hours
  // Cron pattern: '0 */3 * * *' means:
  // - 0: at minute 0
  // - */3: every 3 hours
  // - *: every day of month
  // - *: every month
  // - *: every day of week
  const scheduledTask = cron.schedule('0 */3 * * *', async () => {
    console.log('\n⏰ Running scheduled subscription check at:', new Date().toISOString());
    
    // Check and update expired paid subscriptions
    await checkAndUpdateExpiredSubscriptions();
    
    // Check and update expired trial subscriptions
    await checkAndUpdateExpiredTrials();
    
    console.log('✅ Scheduled subscription check completed.\n');
  }, {
    scheduled: true,
    timezone: 'UTC' // Use UTC to avoid timezone issues
  });
  
  console.log('✅ Subscription scheduler initialized successfully!');
  console.log('📅 Schedule: Every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)');
  
  // Optional: Run an initial check when the server starts
  console.log('🔄 Running initial subscription check...');
  setTimeout(async () => {
    await checkAndUpdateExpiredSubscriptions();
    await checkAndUpdateExpiredTrials();
  }, 5000); // Wait 5 seconds after server start
  
  return scheduledTask;
}

/**
 * Stop the subscription scheduler
 * Useful for graceful shutdown
 */
function stopSubscriptionScheduler(scheduledTask) {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('🛑 Subscription scheduler stopped.');
  }
}

/**
 * Get subscription scheduler status
 * Returns information about the current scheduler state
 */
function getSchedulerStatus(scheduledTask) {
  if (!scheduledTask) {
    return {
      running: false,
      nextRun: null,
      schedule: '0 */3 * * *'
    };
  }
  
  return {
    running: scheduledTask.running,
    schedule: '0 */3 * * *',
    description: 'Every 3 hours',
    timezone: 'UTC'
  };
}

module.exports = {
  initializeSubscriptionScheduler,
  stopSubscriptionScheduler,
  getSchedulerStatus,
  checkAndUpdateExpiredSubscriptions,
  checkAndUpdateExpiredTrials
};