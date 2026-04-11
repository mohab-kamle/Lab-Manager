console.log('Node is working correctly');
console.log('Environment:', process.env.NODE_ENV);
console.log('CWD:', process.cwd());
try {
    const models = require('../models');
    console.log('Models loaded successfully');
} catch (e) {
    console.error('Failed to load models:', e);
}
