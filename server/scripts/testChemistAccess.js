const jwt = require('jsonwebtoken');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;

// Test the JWT token
const testToken = {
  "id": 2,
  "role": "chemist",
  "iat": 1752105514,
  "exp": 1752116314
};

console.log('Testing JWT token...');
console.log('Token payload:', testToken);

try {
  // Create a token with the same payload
  const token = jwt.sign(testToken, SECRET_KEY);
  console.log('Generated token:', token);
  
  // Verify the token
  const decoded = jwt.verify(token, SECRET_KEY);
  console.log('Decoded token:', decoded);
  
  // Test role check
  const allowedRoles = ['admin', 'chemist', 'receptionist'];
  const hasAccess = allowedRoles.includes(decoded.role);
  
  console.log('\nRole check:');
  console.log('  - User role:', decoded.role);
  console.log('  - Allowed roles:', allowedRoles);
  console.log('  - Has access:', hasAccess);
  console.log('  - Role type:', typeof decoded.role);
  console.log('  - Role length:', decoded.role.length);
  
  // Test exact string comparison
  console.log('\nString comparison tests:');
  console.log('  - decoded.role === "chemist":', decoded.role === "chemist");
  console.log('  - decoded.role === "Chemist":', decoded.role === "Chemist");
  console.log('  - decoded.role === "CHEMIST":', decoded.role === "CHEMIST");
  console.log('  - decoded.role.trim() === "chemist":', decoded.role.trim() === "chemist");
  
} catch (error) {
  console.error('Error:', error.message);
} 