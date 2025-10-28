const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: data });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test the component-results endpoint that's failing
async function testComponentResults() {
  try {
    console.log('Step 1: Logging in to get a valid token...');
    
    // First, login to get a valid token
    const loginData = JSON.stringify({
      username: 'ab123', // Use existing admin user from database
      password: 'admin123' // Try common password
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/emp/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('Login Response Status:', loginResponse.statusCode);
    console.log('Login Response Data:', loginResponse.data);
    
    if (loginResponse.statusCode !== 200) {
      console.error('Login failed, cannot proceed with test');
      return;
    }
    
    const loginResult = JSON.parse(loginResponse.data);
    const token = loginResult.token;
    
    if (!token) {
      console.error('No token received from login');
      return;
    }
    
    console.log('\nStep 2: Testing component-results endpoint with valid token...');
    
    const postData = JSON.stringify({
      component_results: [{
        test_component_id: 12, // Use valid component ID from error message
        result: 'test value'
      }]
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/medical-reports/15/tests/12/component-results',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await makeRequest(options, postData);
    console.log('Component Results Response Status:', response.statusCode);
    console.log('Component Results Response Data:', response.data);
  } catch (error) {
    console.error('Error details:');
    console.error('Error message:', error.message);
    console.error('Full Error:', error);
  }
}

testComponentResults();