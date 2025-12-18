
const fs = require('fs');
require('dotenv').config();
const { tg_component, test_group, sequelize } = require('./models');

async function check() {
  try {
    console.log('--- DB Check ---');
    await sequelize.authenticate();
    const count = await tg_component.count();
    console.log('Components Count:', count);
    fs.writeFileSync('db_check_result.txt', 'Count: ' + count);
  } catch (e) {
    console.error(e);
    fs.writeFileSync('db_check_result.txt', 'Error: ' + e.message);
  } finally {
    await sequelize.close();
  }
}
check();
