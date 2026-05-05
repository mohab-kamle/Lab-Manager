const db = require('../../models');

async function setupDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');

    console.log('🔄 Syncing database schema...');
    await db.sequelize.sync({ force: true });
    console.log('✅ Database schema synchronized');

    console.log('🔧 Running additional migrations...');
    
    // Add deleted_at column to test_group if it doesn't exist
    const [results] = await db.sequelize.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'test_group' 
      AND COLUMN_NAME = 'deleted_at'
    `);
    
    if (results[0].count === 0) {
      console.log('📝 Adding deleted_at column to test_group table...');
      await db.sequelize.query(`
        ALTER TABLE test_group 
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);
      console.log('✅ Added deleted_at column to test_group table');
    } else {
      console.log('✅ deleted_at column already exists in test_group table');
    }
    
    // Add index on deleted_at for better performance
    const [indexResults] = await db.sequelize.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'test_group' 
      AND INDEX_NAME = 'idx_test_group_deleted_at'
    `);
    
    if (indexResults[0].count === 0) {
      console.log('📝 Adding index on deleted_at column...');
      await db.sequelize.query(`
        CREATE INDEX idx_test_group_deleted_at ON test_group(deleted_at)
      `);
      console.log('✅ Added index on deleted_at column');
    } else {
      console.log('✅ Index on deleted_at column already exists');
    }

    console.log('✅ Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 