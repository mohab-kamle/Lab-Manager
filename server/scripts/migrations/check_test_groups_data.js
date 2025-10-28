const { sequelize } = require('../models');

async function checkData() {
  try {
    console.log('=== Checking test groups and bills data ===');
    
    // Check available test groups
    const [testGroups] = await sequelize.query('SELECT id, name FROM test_group');
    console.log('Available test groups:', testGroups);
    
    // Check bills for medical reports
    const [bills] = await sequelize.query(`
      SELECT id, date, total FROM bill 
      WHERE id IN (SELECT bill_id FROM medical_report WHERE id IN (8,9,12,13,14))
    `);
    console.log('Bills for medical reports:', bills);
    
    // Check bill_has_tg for these bills
    const [billTestGroups] = await sequelize.query(`
      SELECT * FROM bill_has_tg 
      WHERE bill_id IN (SELECT bill_id FROM medical_report WHERE id IN (8,9,12,13,14))
    `);
    console.log('Bill test groups:', billTestGroups);
    
    // Check medical_report_has_tg
    const [medicalReportTestGroups] = await sequelize.query(`
      SELECT * FROM medical_report_has_tg 
      WHERE medical_report_id IN (8,9,12,13,14)
    `);
    console.log('Medical report test groups:', medicalReportTestGroups);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();