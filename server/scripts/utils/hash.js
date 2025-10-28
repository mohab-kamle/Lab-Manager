const bcrypt = require('bcryptjs');

// Get the password from command line arguments
const password = process.argv[2];

if (!password) {
    console.log('⚠️  Please provide a password to hash.\nExample: node hash.js mypassword');
    process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log(`🔑 Hashed password:\n${hash}`);
