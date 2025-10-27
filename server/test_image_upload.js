const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  try {
    console.log('Testing image upload to comment-images endpoint...');
    
    // Step 1: Login to get a valid token
    console.log('Step 1: Logging in to get a valid token...');
    const loginResponse = await axios.post('http://localhost:3001/emp/login', {
      username: 'ab123', // Use existing admin user from database
      password: 'admin123' // Try common password
    });
    
    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.status, loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    // Step 2: Create a dummy image file for testing
    console.log('Step 2: Creating test image file...');
    const testImagePath = path.join(__dirname, 'test-image.txt');
    fs.writeFileSync(testImagePath, 'This is a test image file content');
    
    // Step 3: Create FormData
    console.log('Step 3: Creating FormData...');
    const formData = new FormData();
    formData.append('images', fs.createReadStream(testImagePath));
    
    // Step 4: Make the request
    console.log('Step 4: Making upload request...');
    const response = await axios.post(
      'http://localhost:3001/medical-reports/1/comment-images', // Replace 1 with actual report ID
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Upload successful:', response.data);
    
    // Clean up
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.error('Upload failed:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    console.error('Full error:', error);
  }
}

testImageUpload();