// Test the bulk save endpoint structure
function testBulkSave() {
  try {
    const baseUrl = 'http://localhost:3001';
    
    // First, get a valid token (you'll need to replace with actual credentials)
    console.log('Testing bulk save endpoint...');
    
    // Sample bulk save payload
    const bulkPayload = {
      test_results: [
        {
          test_id: 2,
          result: 'Test Result 1'
        },
        {
          test_id: 4,
          result: 'Test Result 2'
        }
      ],
      culture_results: [
        {
          culture_id: 1,
          result: 'Culture Result 1'
        }
      ],
      test_component_results: {
        '17': {
          '1': {
            result: 'Component Result 1'
          }
        }
      },
      test_group_values: {
        '2': {
          '1': {
            '1': 'Test Group Value 1'
          }
        }
      },
      culture_antibiotics: {},
      culture_options: {}
    };
    
    console.log('Bulk save payload:', JSON.stringify(bulkPayload, null, 2));
    
    // Note: You'll need to get a valid token and medical report ID to test this
    console.log('\nTo test this endpoint, you need to:');
    console.log('1. Get a valid authentication token');
    console.log('2. Use a valid medical report ID');
    console.log('3. Make a POST request to: /medical-reports/{id}/results/bulk');
    console.log('4. Include the bulk payload in the request body');
    
    console.log('\nExample curl command:');
    console.log(`curl -X POST ${baseUrl}/medical-reports/15/results/bulk \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\');
    console.log(`  -d '${JSON.stringify(bulkPayload)}'`);
    
  } catch (error) {
    console.error('Error testing bulk save:', error.message);
  }
}

testBulkSave();