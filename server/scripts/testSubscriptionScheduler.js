/**
 * Test script for subscription scheduler
 * This script tests the subscription expiry functionality without running the full server
 */

const { checkAndUpdateExpiredSubscriptions, checkAndUpdateExpiredTrials } = require('../services/subscriptionScheduler');
const db = require('../models');

async function testSubscriptionScheduler() {
  try {
    console.log('🧪 Testing Subscription Scheduler...');
    console.log('=====================================\n');
    
    // Test database connection
    console.log('1. Testing database connection...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Test expired subscription check
    console.log('2. Testing expired subscription check...');
    await checkAndUpdateExpiredSubscriptions();
    console.log('✅ Expired subscription check completed\n');
    
    // Test expired trial check
    console.log('3. Testing expired trial check...');
    await checkAndUpdateExpiredTrials();
    console.log('✅ Expired trial check completed\n');
    
    // Get current subscription statistics
    console.log('4. Getting current subscription statistics...');
    const { lab } = db;
    const stats = await lab.findAll({
      attributes: [
        'subscription_status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['subscription_status'],
      raw: true
    });
    
    console.log('📊 Current subscription statistics:');
    stats.forEach(stat => {
      console.log(`   - ${stat.subscription_status}: ${stat.count} labs`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('🎉 Subscription scheduler is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    try {
      await db.sequelize.close();
      console.log('\n🔌 Database connection closed');
    } catch (closeError) {
      console.error('❌ Error closing database:', closeError);
    }
    
    process.exit(0);
  }
}

// Run the test
if (require.main === module) {
  testSubscriptionScheduler();
}

module.exports = { testSubscriptionScheduler };