
const { initModels } = require('../models/init-models');
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const sequelize = new Sequelize(process.env.DATABASE_URL || 'mysql://root:rootpassword@localhost:3306/labmanager', {
  logging: false,
  dialect: 'mysql'
});

async function check() {
  try {
    const models = initModels(sequelize);
    const messages = await models.whatsapp_message.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      raw: true
    });
    console.log(JSON.stringify(messages, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
