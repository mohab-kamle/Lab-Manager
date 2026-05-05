const { Sequelize } = require('sequelize');
const config = require('../config/config.js');

// Use development config
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: false // Disable query logging for cleaner output
  }
);

async function checkIndexes() {
  try {
    console.log('🔍 Checking indexes on lab_payment table...');

    // Show all indexes on lab_payment table
    const [results] = await sequelize.query('SHOW INDEXES FROM lab_payment');

    console.log('\n📊 Current indexes on lab_payment:');
    console.log('Key_name\t\t\tColumn_name\t\tNon_unique\tIndex_type');
    console.log('--------\t\t\t-----------\t\t----------\t----------');

    const paymentIntentionIndexes = [];

    results.forEach(index => {
      console.log(`${index.Key_name}\t\t${index.Column_name}\t\t${index.Non_unique}\t\t${index.Index_type}`);

      // Collect payment_intention_id indexes
      if (index.Column_name === 'payment_intention_id') {
        paymentIntentionIndexes.push(index.Key_name);
      }
    });

    console.log(`\n🔍 Found ${paymentIntentionIndexes.length} indexes on payment_intention_id:`);
    paymentIntentionIndexes.forEach((indexName, i) => {
      console.log(`${i + 1}. ${indexName}`);
    });

    if (paymentIntentionIndexes.length > 1) {
      console.log('\n⚠️  Multiple indexes detected on payment_intention_id!');
      console.log('\n🛠️  SQL commands to drop duplicate indexes:');

      // Keep the first one (usually the primary or main unique index)
      for (let i = 1; i < paymentIntentionIndexes.length; i++) {
        console.log(`ALTER TABLE lab_payment DROP INDEX \`${paymentIntentionIndexes[i]}\`;`);
      }
    } else {
      console.log('\n✅ No duplicate indexes found on payment_intention_id.');
    }

    console.log(`\n📈 Total indexes on lab_payment: ${results.length}`);
    if (results.length >= 60) {
      console.log('⚠️  Warning: Approaching MySQL 64-key limit!');
    }

  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkIndexes();