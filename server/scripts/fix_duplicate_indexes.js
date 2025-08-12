const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

// Use development config
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: console.log // Enable logging to see the DROP commands
  }
);

async function fixDuplicateIndexes() {
  try {
    console.log('🔧 Starting duplicate index cleanup on lab_payment table...');
    
    // Get all indexes on lab_payment table
    const [results] = await sequelize.query('SHOW INDEXES FROM lab_payment');
    
    const paymentIntentionIndexes = [];
    
    results.forEach(index => {
      if (index.Column_name === 'payment_intention_id') {
        paymentIntentionIndexes.push(index.Key_name);
      }
    });
    
    console.log(`\n📊 Found ${paymentIntentionIndexes.length} indexes on payment_intention_id:`);
    paymentIntentionIndexes.forEach((indexName, i) => {
      console.log(`${i + 1}. ${indexName}`);
    });
    
    if (paymentIntentionIndexes.length <= 1) {
      console.log('\n✅ No duplicate indexes to remove.');
      return;
    }
    
    console.log('\n🗑️  Removing duplicate indexes (keeping the first one)...');
    
    // Keep the first index, drop the rest
    const indexesToDrop = paymentIntentionIndexes.slice(1);
    
    for (const indexName of indexesToDrop) {
      try {
        console.log(`\n🔧 Dropping index: ${indexName}`);
        await sequelize.query(`ALTER TABLE lab_payment DROP INDEX \`${indexName}\``);
        console.log(`✅ Successfully dropped: ${indexName}`);
      } catch (error) {
        console.error(`❌ Failed to drop ${indexName}:`, error.message);
      }
    }
    
    console.log('\n🎉 Duplicate index cleanup completed!');
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const [newResults] = await sequelize.query('SHOW INDEXES FROM lab_payment');
    
    const remainingPaymentIntentionIndexes = newResults.filter(
      index => index.Column_name === 'payment_intention_id'
    );
    
    console.log(`\n📈 Total indexes on lab_payment: ${newResults.length}`);
    console.log(`📊 Remaining payment_intention_id indexes: ${remainingPaymentIntentionIndexes.length}`);
    
    if (remainingPaymentIntentionIndexes.length === 1) {
      console.log('✅ Perfect! Only one payment_intention_id index remains.');
    }
    
    if (newResults.length < 60) {
      console.log('✅ Successfully reduced index count below warning threshold!');
    }
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixDuplicateIndexes();