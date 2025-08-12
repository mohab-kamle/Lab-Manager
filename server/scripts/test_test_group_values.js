const https = require('https');
const http = require('http');

// Configuration
const apiUrl = 'http://localhost:3001';
const reportId = 10; // Using medical report ID 10 (which has test groups)
const testGroupId = 1; // Using test group ID 1

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = requestModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ data: parsedData, status: res.statusCode });
        } catch (e) {
          resolve({ data: data, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function testTestGroupValues() {
  try {
    console.log('Testing test group values endpoint...');
    
    // Step 1: Login to get JWT token
    console.log('\n1. Logging in...');
    const loginResponse = await makeRequest(`${apiUrl}/emp/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        username: 'ab123',
        password: 'admin123'
      }
    });
    
    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.status, loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Get test groups for the medical report to see structure
    console.log('\n2. Getting test groups for medical report...');
    const testGroupsResponse = await makeRequest(
      `${apiUrl}/medical-reports/${reportId}/test-groups`,
      { headers }
    );
    
    console.log('Test groups response:', JSON.stringify(testGroupsResponse.data, null, 2));
    
    if (testGroupsResponse.data.length === 0) {
      console.log('No test groups found for this medical report');
      return;
    }
    
    const firstTestGroup = testGroupsResponse.data[0];
    console.log('\nFirst test group structure:', {
      id: firstTestGroup.id,
      name: firstTestGroup.name,
      components: firstTestGroup.direct_components?.length || 0,
      categories: firstTestGroup.categories?.length || 0,
      fields: firstTestGroup.fields?.length || 0,
      currentValues: firstTestGroup.values
    });
    
    // Step 3: Prepare test data for saving
    if (firstTestGroup.direct_components?.length > 0 && firstTestGroup.fields?.length > 0) {
      const componentId = firstTestGroup.direct_components[0].id;
      const fieldId = firstTestGroup.fields[0].id;
      
      console.log('\n3. Saving test group values...');
      console.log(`Using component ID: ${componentId}, field ID: ${fieldId}`);
      
      const testValues = {
        [componentId]: {
          [fieldId]: 'Test Value 123'
        }
      };
      
      console.log('Test values to save:', testValues);
      
      const saveResponse = await makeRequest(
        `${apiUrl}/medical-reports/${reportId}/test-groups`,
        {
          method: 'POST',
          headers,
          data: {
            test_group_id: firstTestGroup.id,
            values: testValues
          }
        }
      );
      
      console.log('Save response:', saveResponse.data);
      console.log('Status:', saveResponse.status);
      
      // Step 4: Verify the values were saved by fetching again
      console.log('\n4. Verifying saved values...');
      const verifyResponse = await makeRequest(
        `${apiUrl}/medical-reports/${reportId}/test-groups`,
        { headers }
      );
      
      const updatedTestGroup = verifyResponse.data.find(tg => tg.id === firstTestGroup.id);
      console.log('Updated test group values:', updatedTestGroup?.values);
      
    } else {
      console.log('No components or fields found in the test group to test with');
    }
    
  } catch (error) {
    console.error('Error testing test group values:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testTestGroupValues();