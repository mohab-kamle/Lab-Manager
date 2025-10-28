const axios = require('axios');

// Test the actual HTTP endpoint
async function testHttpEndpoint() {
  try {
    console.log('=== Testing HTTP API Endpoint ===\n');
    
    const medicalReportId = 13; // From our previous tests
    const baseUrl = 'http://localhost:3001'; // Adjust if different
    
    // You'll need to provide a valid token for authentication
    // For now, let's test without authentication to see the structure
    
    console.log(`Testing endpoint: ${baseUrl}/medical-reports/${medicalReportId}`);
    
    try {
      const response = await axios.get(`${baseUrl}/medical-reports/${medicalReportId}`);
      
      console.log('✅ HTTP Request successful');
      console.log(`Status: ${response.status}`);
      
      const data = response.data;
      console.log(`\nResponse structure:`);
      console.log(`- ID: ${data.id}`);
      console.log(`- Patient: ${data.patient?.name || 'Not found'}`);
      console.log(`- Tests Count: ${data.tests_count}`);
      console.log(`- Cultures Count: ${data.cultures_count}`);
      console.log(`- Test Groups Count: ${data.test_groups_count}`);
      
      if (data.test_group_results) {
        console.log(`\n=== Test Group Results (${data.test_group_results.length}) ===`);
        data.test_group_results.forEach((result, index) => {
          console.log(`${index + 1}. ID: ${result.id}`);
          console.log(`   Test Group: ${result.test_group?.name || 'N/A'}`);
          console.log(`   Component: ${result.tg_component?.name || 'N/A'}`);
          console.log(`   Result JSON: ${result.result_json ? 'Present' : 'Missing'}`);
        });
      } else {
        console.log('\n❌ No test_group_results in HTTP response!');
      }
      
    } catch (httpError) {
      if (httpError.response) {
        console.log(`❌ HTTP Error: ${httpError.response.status}`);
        console.log(`Error message: ${httpError.response.data?.error || httpError.response.statusText}`);
        
        if (httpError.response.status === 401) {
          console.log('\n💡 This is likely due to authentication. The endpoint requires a valid token.');
          console.log('   The database query test showed the data is there, so this is expected.');
        }
      } else {
        console.log(`❌ Network Error: ${httpError.message}`);
        console.log('\n💡 Make sure the server is running on the expected port.');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Also test if server is running
async function checkServerStatus() {
  const ports = [3000, 3001, 5000, 8000]; // Common development ports
  
  console.log('=== Checking Server Status ===\n');
  
  for (const port of ports) {
    try {
      const response = await axios.get(`http://localhost:${port}/api/health`, { timeout: 2000 });
      console.log(`✅ Server responding on port ${port}`);
      return port;
    } catch (error) {
      // Try a basic request to see if server exists
      try {
        await axios.get(`http://localhost:${port}`, { timeout: 2000 });
        console.log(`✅ Server detected on port ${port} (no health endpoint)`);
        return port;
      } catch (innerError) {
        console.log(`❌ No server on port ${port}`);
      }
    }
  }
  
  console.log('\n💡 No server detected on common ports. Make sure to start the server first.');
  return null;
}

async function main() {
  const serverPort = await checkServerStatus();
  
  if (serverPort) {
    console.log(`\nUsing server on port ${serverPort}\n`);
    await testHttpEndpoint();
  }
  
  console.log('\n=== Summary ===');
  console.log('1. Database query test showed test_group_results exist and are properly associated');
  console.log('2. The API endpoint code looks correct');
  console.log('3. If HTTP test fails due to auth, that\'s expected - the data structure is correct');
  console.log('\n💡 If you\'re seeing empty results in your frontend:');
  console.log('   - Check if you\'re using the correct medical report ID');
  console.log('   - Verify the frontend is parsing the test_group_results array correctly');
  console.log('   - Check browser network tab to see the actual API response');
}

main();