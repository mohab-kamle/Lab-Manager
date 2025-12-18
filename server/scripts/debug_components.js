
const fs = require('fs');
const result = require('dotenv').config();

function log(msg) {
  console.log(msg);
  fs.appendFileSync('debug_log.txt', msg + '\n');
}

log('Dotenv result: ' + (result.error ? 'Error' : 'Loaded'));
log('DATABASE_URL defined: ' + !!process.env.DATABASE_URL);
log('Starting model import...');
const { tg_component, test_group, tgc_category, sequelize } = require('../models');

async function testQuery() {
  try {
    await sequelize.authenticate();
    log('Database connected.');

    const components = await tg_component.findAll({
      include: [
        { 
          model: test_group, 
          as: 'test_group', 
          attributes: ['id', 'name'] 
        },
        { 
          model: tgc_category, 
          as: 'category', 
          attributes: ['id', 'name'] 
        }
      ],
      limit: 5 // Limit to first 5 items
    });

    log(`Found ${components.length} components.`);
    if (components.length > 0) {
      log('Sample component: ' + JSON.stringify(components[0].toJSON(), null, 2));
    } else {
      log('No components found. Checking count without include...');
      const count = await tg_component.count();
      log(`Total components in DB (raw count): ${count}`);
    }

  } catch (error) {
    log('Query failed: ' + error);
    if (error.sql) {
        log('SQL: ' + error.sql);
    }
  } finally {
    await sequelize.close();
  }
}

testQuery();
