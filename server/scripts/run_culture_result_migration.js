const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'labmanager',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  }
);

async function runCultureResultMigration() {
  console.log('🚀 Starting Culture Result Migration...');
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');

    console.log('📋 Creating medical_report_culture_result table...');
    
    // Create table using Sequelize queryInterface
    const queryInterface = sequelize.getQueryInterface();
    
    await queryInterface.createTable('medical_report_culture_result', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      medical_report_has_culture_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'medical_report_has_culture',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      culture_option_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Static copy of culture option name at time of result entry'
      },
      culture_sub_option_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Static copy of culture sub-option name at time of result entry'
      },
      custom_result: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Custom text result when no predefined options are suitable'
      },
      result_type: {
        type: DataTypes.ENUM('option', 'sub_option', 'custom'),
        allowNull: false,
        defaultValue: 'custom',
        comment: 'Type of result: option (main option only), sub_option (option + sub-option), custom (free text)'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    
    // Add indexes
    await queryInterface.addIndex('medical_report_culture_result', {
      fields: ['medical_report_has_culture_id'],
      name: 'idx_medical_report_has_culture_id'
    });
    
    await queryInterface.addIndex('medical_report_culture_result', {
      fields: ['result_type'],
      name: 'idx_result_type'
    });
    
    console.log('✅ Table and indexes created successfully');
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify table creation
    console.log('📊 Verification:');
    const [results] = await sequelize.query("SHOW TABLES LIKE 'medical_report_culture_result'");
    if (results.length > 0) {
      console.log('   ✅ medical_report_culture_result table created successfully');
      
      // Show table structure
      const [structure] = await sequelize.query("DESCRIBE medical_report_culture_result");
      console.log('   📋 Table structure:');
      structure.forEach(col => {
        console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } else {
      console.log('   ❌ medical_report_culture_result table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runCultureResultMigration().catch(console.error);