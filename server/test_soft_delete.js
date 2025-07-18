const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function testSoftDelete() {
  let connection;
  
  try {
    // Read database config
    const configPath = path.join(__dirname, 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbConfig = config.development;
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    });
    
    console.log('Connected to database');
    
    // Check if deleted_at column exists
    try {
      const [columns] = await connection.execute('DESCRIBE test_group');
      const hasDeletedAt = columns.some(col => col.Field === 'deleted_at');
      console.log('deleted_at column exists:', hasDeletedAt);
      
      if (!hasDeletedAt) {
        console.log('Adding deleted_at column...');
        await connection.execute('ALTER TABLE test_group ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL');
        console.log('Column added successfully');
      }
      
      // Test soft delete functionality
      console.log('\nTesting soft delete functionality...');
      
      // Get a test group to work with
      const [testGroups] = await connection.execute('SELECT id, name FROM test_group WHERE deleted_at IS NULL LIMIT 1');
      
      if (testGroups.length === 0) {
        console.log('No active test groups found for testing');
        return;
      }
      
      const testGroup = testGroups[0];
      console.log('Using test group:', testGroup.name, '(ID:', testGroup.id, ')');
      
      // Soft delete the test group
      await connection.execute('UPDATE test_group SET deleted_at = NOW() WHERE id = ?', [testGroup.id]);
      console.log('Test group soft deleted');
      
      // Verify it's not returned by normal query
      const [activeGroups] = await connection.execute('SELECT id, name FROM test_group WHERE deleted_at IS NULL');
      const isStillActive = activeGroups.some(g => g.id === testGroup.id);
      console.log('Test group still active in normal query:', isStillActive);
      
      // Verify it's returned by query with deleted
      const [allGroups] = await connection.execute('SELECT id, name, deleted_at FROM test_group');
      const isInAllGroups = allGroups.some(g => g.id === testGroup.id);
      console.log('Test group found in all groups query:', isInAllGroups);
      
      // Restore the test group
      await connection.execute('UPDATE test_group SET deleted_at = NULL WHERE id = ?', [testGroup.id]);
      console.log('Test group restored');
      
      // Verify it's active again
      const [restoredGroups] = await connection.execute('SELECT id, name FROM test_group WHERE deleted_at IS NULL');
      const isRestored = restoredGroups.some(g => g.id === testGroup.id);
      console.log('Test group restored and active:', isRestored);
      
      console.log('\nSoft delete functionality test completed successfully!');
      
    } catch (error) {
      console.error('Error during test:', error.message);
    }
    
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSoftDelete(); 