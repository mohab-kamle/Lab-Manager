const { employee } = require('../models');

// Check what employees exist in the database
async function checkEmployees() {
  try {
    console.log('Checking existing employees in database...');
    
    const employees = await employee.findAll({
      attributes: ['id', 'name', 'username', 'role', 'lab_id'],
      order: [['id', 'ASC']]
    });
    
    if (employees.length === 0) {
      console.log('No employees found in database.');
      return;
    }
    
    console.log(`Found ${employees.length} employees:`);
    console.log('\nEmployee List:');
    console.log('ID | Name | Username | Role | Lab ID');
    console.log('---|------|----------|------|-------');
    
    employees.forEach(emp => {
      console.log(`${emp.id} | ${emp.name} | ${emp.username} | ${emp.role} | ${emp.lab_id}`);
    });
    
    console.log('\nYou can use any of these usernames for testing.');
    console.log('Note: You may need to check the actual password or reset it.');
    
  } catch (error) {
    console.error('Error checking employees:', error.message);
  }
}

// Run the check
checkEmployees();