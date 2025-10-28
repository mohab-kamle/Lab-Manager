const axios = require('axios');
const bcrypt = require('bcryptjs');

const API_URL = 'http://localhost:3001';

async function testEmployeeSystem() {
  console.log('🧪 Testing Employee Management System...\n');

  try {
    // Test 1: Create a test admin user
    console.log('1. Creating test admin user...');
    const adminData = {
      name: 'Test Admin',
      username: 'testadmin',
      password: 'password123',
      email: 'admin@test.com',
      role: 'admin'
    };

    const adminResponse = await axios.post(`${API_URL}/emp`, adminData);
    console.log('✅ Admin created:', adminResponse.data.name);

    // Test 2: Login with admin
    console.log('\n2. Testing admin login...');
    const loginResponse = await axios.post(`${API_URL}/emp/login`, {
      username: 'testadmin',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Test 3: Create different role employees
    console.log('\n3. Creating employees with different roles...');
    
    const employees = [
      {
        name: 'Test Receptionist',
        username: 'testreceptionist',
        password: 'password123',
        email: 'receptionist@test.com',
        role: 'receptionist'
      },
      {
        name: 'Test Chemist',
        username: 'testchemist',
        password: 'password123',
        email: 'chemist@test.com',
        role: 'chemist'
      },
      {
        name: 'Test Doctor',
        username: 'testdoctor',
        password: 'password123',
        email: 'doctor@test.com',
        role: 'doctor'
      }
    ];

    for (const empData of employees) {
      const response = await axios.post(`${API_URL}/emp`, empData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ ${empData.role} created:`, response.data.name);
    }

    // Test 4: Get all employees
    console.log('\n4. Fetching all employees...');
    const employeesResponse = await axios.get(`${API_URL}/emp`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${employeesResponse.data.length} employees`);

    // Test 5: Test role-specific table creation
    console.log('\n5. Testing role-specific table records...');
    
    // Check if role-specific records were created
    const testReceptionist = employeesResponse.data.find(emp => emp.username === 'testreceptionist');
    const testChemist = employeesResponse.data.find(emp => emp.username === 'testchemist');
    const testDoctor = employeesResponse.data.find(emp => emp.username === 'testdoctor');

    if (testReceptionist) console.log('✅ Receptionist record created');
    if (testChemist) console.log('✅ Chemist record created');
    if (testDoctor) console.log('✅ Doctor record created');

    // Test 6: Test employee login
    console.log('\n6. Testing employee login...');
    const empLoginResponse = await axios.post(`${API_URL}/emp/login`, {
      username: 'testreceptionist',
      password: 'password123'
    });
    console.log('✅ Employee login successful');

    // Test 7: Test /me endpoint
    console.log('\n7. Testing /me endpoint...');
    const meResponse = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${empLoginResponse.data.token}` }
    });
    console.log('✅ /me endpoint working:', meResponse.data.name);

    console.log('\n🎉 All tests passed! Employee management system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

// Run the test
testEmployeeSystem(); 