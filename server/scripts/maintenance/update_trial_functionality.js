const { sequelize } = require('../models');

async function updateTrialFunctionality() {
  try {
    console.log('Updating database with trial functionality...');
    
    // Update ENUM values for subscription_duration
    try {
      await sequelize.query(`
        ALTER TABLE lab 
        MODIFY COLUMN subscription_duration 
        ENUM('free_trial', 'monthly', '3_months', '6_months', 'yearly') 
        DEFAULT 'free_trial'
      `);
      console.log('✓ Updated subscription_duration ENUM');
    } catch (error) {
      console.log('→ subscription_duration ENUM already updated');
    }

    // Update ENUM values for subscription_status
    try {
      await sequelize.query(`
        ALTER TABLE lab 
        MODIFY COLUMN subscription_status 
        ENUM('trial', 'active', 'suspended', 'cancelled', 'expired') 
        DEFAULT 'trial'
      `);
      console.log('✓ Updated subscription_status ENUM');
    } catch (error) {
      console.log('→ subscription_status ENUM already updated');
    }

    // Update existing labs to have trial status if they don't have a subscription
    try {
      await sequelize.query(`
        UPDATE lab 
        SET subscription_duration = 'free_trial', 
            subscription_status = 'trial',
            subscription_start_date = COALESCE(subscription_start_date, NOW()),
            subscription_end_date = COALESCE(subscription_end_date, DATE_ADD(NOW(), INTERVAL 14 DAY))
        WHERE subscription_status IS NULL 
           OR subscription_status = 'active' 
           AND subscription_duration IS NULL
      `);
      console.log('✓ Updated existing labs to trial status');
    } catch (error) {
      console.log('→ Error updating existing labs:', error.message);
    }

    // Set default trial end date for labs without one
    try {
      await sequelize.query(`
        UPDATE lab 
        SET subscription_end_date = DATE_ADD(NOW(), INTERVAL 14 DAY)
        WHERE subscription_status = 'trial' 
          AND subscription_end_date IS NULL
      `);
      console.log('✓ Set default trial end dates');
    } catch (error) {
      console.log('→ Error setting default trial dates:', error.message);
    }

    console.log('✅ Trial functionality update completed successfully!');
    
  } catch (error) {
    console.error('Trial functionality update failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateTrialFunctionality();
}

module.exports = updateTrialFunctionality; 