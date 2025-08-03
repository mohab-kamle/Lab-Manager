const http = require('http');

function testMedicalReportAPI() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/medical_reports/14',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('=== Medical Report 14 API Response ===');
        console.log('Status Code:', res.statusCode);
        
        if (response.tg_id_test_groups) {
          console.log('\nTest Groups:');
          console.log(JSON.stringify(response.tg_id_test_groups, null, 2));
          
          console.log('\nTest Group Count:', response.tg_id_test_groups.length);
          
          if (response.tg_id_test_groups.length > 1) {
            console.log('\n🎉 SUCCESS: Medical report now shows multiple test groups!');
          } else {
            console.log('\n⚠️  WARNING: Medical report still shows only one test group');
          }
        } else {
          console.log('\n❌ ERROR: No test groups found in response');
        }
        
        // Also show the full response structure for debugging
        console.log('\n=== Full Response Structure ===');
        const keys = Object.keys(response);
        console.log('Response keys:', keys);
        
      } catch (error) {
        console.error('Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error.message);
    console.log('\nMake sure the server is running on http://localhost:3001');
  });

  req.end();
}

console.log('Testing Medical Report API endpoint...');
testMedicalReportAPI();