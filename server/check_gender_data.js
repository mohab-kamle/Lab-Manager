const { sequelize } = require('./models');

async function checkGenderData() {
  try {
    console.log('Checking current gender data in all tables...\n');
    
    // Check patient table
    const patientResults = await sequelize.query("SELECT DISTINCT gender, COUNT(*) as count FROM patient GROUP BY gender");
    console.log('Patient table gender data:');
    console.log(patientResults[0]);
    console.log('');
    
    // Check doctor table
    const doctorResults = await sequelize.query("SELECT DISTINCT gender, COUNT(*) as count FROM doctor GROUP BY gender");
    console.log('Doctor table gender data:');
    console.log(doctorResults[0]);
    console.log('');
    
    // Check employee table
    const employeeResults = await sequelize.query("SELECT DISTINCT gender, COUNT(*) as count FROM employee GROUP BY gender");
    console.log('Employee table gender data:');
    console.log(employeeResults[0]);
    console.log('');
    
    // Check test_component table
    const testComponentResults = await sequelize.query("SELECT DISTINCT gender, COUNT(*) as count FROM test_component GROUP BY gender");
    console.log('Test_component table gender data:');
    console.log(testComponentResults[0]);
    console.log('');
    
    // Also check for any NULL values
    console.log('Checking for NULL values:');
    const nullChecks = await Promise.all([
      sequelize.query("SELECT COUNT(*) as count FROM patient WHERE gender IS NULL"),
      sequelize.query("SELECT COUNT(*) as count FROM doctor WHERE gender IS NULL"),
      sequelize.query("SELECT COUNT(*) as count FROM employee WHERE gender IS NULL"),
      sequelize.query("SELECT COUNT(*) as count FROM test_component WHERE gender IS NULL")
    ]);
    
    console.log(`Patient NULL gender: ${nullChecks[0][0][0].count}`);
    console.log(`Doctor NULL gender: ${nullChecks[1][0][0].count}`);
    console.log(`Employee NULL gender: ${nullChecks[2][0][0].count}`);
    console.log(`Test_component NULL gender: ${nullChecks[3][0][0].count}`);
    
  } catch (error) {
    console.error('Error checking gender data:', error);
  }
}

checkGenderData()
  .then(() => {
    console.log('\nCheck completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  }); 