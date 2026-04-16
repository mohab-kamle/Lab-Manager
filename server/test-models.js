// Quick test to check if models load without errors
try {
  const db = require('./models');
  console.log('✅ Models loaded successfully');
  console.log('Available models:', Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize').slice(0, 20));
  process.exit(0);
} catch (error) {
  console.error('❌ Error loading models:', error.message);
  console.error(error.stack);
  process.exit(1);
}
