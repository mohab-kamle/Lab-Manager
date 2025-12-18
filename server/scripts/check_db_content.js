
const fs = require('fs');
require('dotenv').config();
const { tg_component, test_group, tgc_category, sequelize } = require('../models');

async function check() {
  const logStream = fs.createWriteStream('db_check.txt', { flags: 'w' });
  const log = (msg) => {
    console.log(msg);
    logStream.write(msg + '\n');
  };

  try {
    log('--- DB Content Check ---');
    await sequelize.authenticate();
    log('Database connection OK.');

    // Count Test Groups
    const tgCount = await test_group.count();
    const tgCountAll = await test_group.count({ paranoid: false });
    log(`Test Groups: Active=${tgCount}, Total=${tgCountAll}`);

    // Count Components
    const compCount = await tg_component.count();
    const compCountAll = await tg_component.count({ paranoid: false });
    log(`Components: Active=${compCount}, Total=${compCountAll}`);
    
    // Sample Component
    if (compCountAll > 0) {
      const sample = await tg_component.findOne({ paranoid: false });
      log('Sample Component: ' + JSON.stringify(sample.toJSON(), null, 2));
    }

  } catch (e) {
    log('ERROR: ' + e.message);
  } finally {
    await sequelize.close();
    logStream.end();
  }
}

check();
