const axios = require('axios');

async function testDirectApi() {
  try {
    console.log('Testing direct API call to test groups endpoint...');
    
    // Make a direct call to the API endpoint
    const response = await axios.get('http://localhost:5000/api/medical-reports/1/test-groups');
    
    console.log('\n=== API Response ===');
    console.log('Status:', response.status);
    console.log('Data length:', response.data.length);
    
    if (response.data && response.data.length > 0) {
      const firstGroup = response.data[0];
      console.log('\nFirst test group:');
      console.log('- ID:', firstGroup.id);
      console.log('- Name:', firstGroup.name);
      console.log('- Direct components count:', firstGroup.direct_components?.length || 0);
      console.log('- Categories count:', firstGroup.categories?.length || 0);
      console.log('- Fields count:', firstGroup.fields?.length || 0);
      console.log('- Values structure:');
      console.log(JSON.stringify(firstGroup.values, null, 2));
      
      // Check if values object has any data
      const hasValues = firstGroup.values && Object.keys(firstGroup.values).length > 0;
      console.log('- Has values:', hasValues);
      
      if (hasValues) {
        console.log('\nDetailed values breakdown:');
        Object.entries(firstGroup.values).forEach(([componentId, fields]) => {
          console.log(`  Component ${componentId}:`);
          if (fields && typeof fields === 'object') {
            Object.entries(fields).forEach(([fieldId, value]) => {
              console.log(`    Field ${fieldId}: "${value}"`);
            });
          } else {
            console.log(`    No field data (type: ${typeof fields})`);
          }
        });
      }
    }
    
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.statusText);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

testDirectApi();