'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};
const queryLogger = (sql, timing) => {
  if (typeof timing === 'number' && timing > 150) {
    let tableMatch = sql.match(/from\s+`?(\w+)`?/i) || sql.match(/update\s+`?(\w+)`?/i);
    let tableName = tableMatch ? tableMatch[1] : 'Unknown table/model';
    console.log(`⚠️  Slow query (${timing} ms) on table/model: ${tableName}`);
    console.log(`SQL: ${sql}\n`);
  }
};
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    ...config,
    logging: queryLogger,
    benchmark: true
  });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    logging: queryLogger,
    benchmark: true
  });
}

// Initialize models with associations
const initModels = require('./init-models');
const models = initModels(sequelize);

// Add models to db object
Object.keys(models).forEach(modelName => {
  db[modelName] = models[modelName];
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
