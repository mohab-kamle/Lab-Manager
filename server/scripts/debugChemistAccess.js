const axios = require('axios');
const jwt = require('jsonwebtoken');
require("dotenv").config();

const API_URL = 'http://localhost:3001';
const SECRET_KEY = process.env.SECRET_KEY;

async function debugChemistAccess() {
  console.log('🔍 Debugging Chemist Access Issue...\n');

  try {
    // Step 1: Test JWT token creation and verification
    console.log('1. Testing JWT token...');
    const payload = {
      id: 2,
      role: "chemist"
    };
    
    const token = jwt.sign(payload, SECRET_KEY);
    console.log('✅ Token created:', token.substring(0, 50) + '...');
    
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('✅ Token decoded:', decoded);
    
    // Step 2: Test role comparison
    console.log('\n2. Testing role comparison...');
    const allowedRoles = ['admin', 'chemist', 'receptionist'];
    const hasAccess = allowedRoles.includes(decoded.role);
    
    console.log('  - User role:', `"${decoded.role}"`);
    console.log('  - Role type:', typeof decoded.role);
    console.log('  - Role length:', decoded.role.length);
    console.log('  - Role char codes:', Array.from(decoded.role).map(c => c.charCodeAt(0)));
    console.log('  - Allowed roles:', allowedRoles);
    console.log('  - Has access:', hasAccess);
    
    // Step 3: Test API call with fresh token
    console.log('\n3. Testing API call...');
    const response = await axios.get(`${API_URL}/medical-reports`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API call successful');
    console.log('  - Status:', response.status);
    console.log('  - Data length:', response.data.length);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('  - Status:', error.response?.status);
    console.error('  - Headers:', error.response?.headers);
  }
}

// Run the debug
debugChemistAccess(); 