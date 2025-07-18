const { sequelize } = require('./models');

async function checkTable() {
  try {
    console.log('=== Checking medical_report_has_tg table ===');
    
    // Check current records
    const [records] = await sequelize.query('SELECT * FROM medical_report_has_tg');
    console.log('Current records:', records);
    
    // Check table structure
    const [structure] = await sequelize.query('DESCRIBE medical_report_has_tg');
    console.log('Table structure:', structure);
    
    // Check indexes
    const [indexes] = await sequelize.query('SHOW INDEX FROM medical_report_has_tg');
    console.log('Indexes:', indexes);
    
    // Check constraints
    const [constraints] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'labmanager' 
      AND TABLE_NAME = 'medical_report_has_tg'
    `);
    console.log('Constraints:', constraints);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTable(); 