const { sequelize } = require('../models');

async function runSimpleMigration() {
  try {
    console.log('Starting simple multi-tenant migration...');
    
    // Step 1: Add lab_id columns to all tables
    const addLabIdColumns = [
      "ALTER TABLE patient ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE bill ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE bill ADD COLUMN branch_id INT AFTER lab_id",
      "ALTER TABLE medical_report ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE medical_report ADD COLUMN branch_id INT AFTER lab_id",
      "ALTER TABLE employee ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE contract ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE packages_and_offers ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE payment_method ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE company ADD COLUMN lab_id INT AFTER id",
      "ALTER TABLE doctor ADD COLUMN lab_id INT AFTER id"
    ];

    console.log('Step 1: Adding lab_id columns...');
    for (let i = 0; i < addLabIdColumns.length; i++) {
      try {
        await sequelize.query(addLabIdColumns[i]);
        console.log(`✓ Added lab_id to table ${i + 1}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`→ Column already exists for table ${i + 1}`);
        } else {
          console.error(`✗ Error adding lab_id to table ${i + 1}:`, error.message);
        }
      }
    }

    // Step 2: Add new columns to lab table
    const addLabColumns = [
      "ALTER TABLE lab ADD COLUMN tenant_id VARCHAR(50) UNIQUE AFTER id",
      "ALTER TABLE lab ADD COLUMN subdomain VARCHAR(100) UNIQUE AFTER tenant_id",
      "ALTER TABLE lab ADD COLUMN subscription_duration ENUM('monthly', '3_months', '6_months', 'yearly') DEFAULT 'monthly' AFTER owner_id",
      "ALTER TABLE lab ADD COLUMN subscription_status ENUM('active', 'suspended', 'cancelled', 'expired') DEFAULT 'active' AFTER subscription_duration",
      "ALTER TABLE lab ADD COLUMN subscription_start_date DATE AFTER subscription_status",
      "ALTER TABLE lab ADD COLUMN subscription_end_date DATE AFTER subscription_start_date",
      "ALTER TABLE lab ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT 0.00 AFTER subscription_end_date",
      "ALTER TABLE lab ADD COLUMN lab_name_invoice VARCHAR(100) AFTER subscription_amount",
      "ALTER TABLE lab ADD COLUMN lab_phone VARCHAR(20) AFTER lab_name_invoice",
      "ALTER TABLE lab ADD COLUMN lab_address TEXT AFTER lab_phone",
      "ALTER TABLE lab ADD COLUMN lab_email VARCHAR(100) AFTER lab_address",
      "ALTER TABLE lab ADD COLUMN lab_website VARCHAR(255) AFTER lab_email",
      "ALTER TABLE lab ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER lab_website",
      "ALTER TABLE lab ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
      "ALTER TABLE lab ADD COLUMN created_by INT AFTER updated_at",
      "ALTER TABLE lab ADD COLUMN updated_by INT AFTER created_by"
    ];

    console.log('\nStep 2: Adding new columns to lab table...');
    for (let i = 0; i < addLabColumns.length; i++) {
      try {
        await sequelize.query(addLabColumns[i]);
        console.log(`✓ Added column ${i + 1} to lab table`);
      } catch (error) {
        if (error.message.includes('Duplicate column name') || error.message.includes('Duplicate key name')) {
          console.log(`→ Column already exists for lab table ${i + 1}`);
        } else {
          console.error(`✗ Error adding column to lab table ${i + 1}:`, error.message);
        }
      }
    }

    // Step 3: Add is_main_branch to branch table
    try {
      await sequelize.query("ALTER TABLE branch ADD COLUMN is_main_branch BOOLEAN DEFAULT FALSE AFTER manager_id");
      console.log('✓ Added is_main_branch to branch table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('→ is_main_branch column already exists');
      } else {
        console.error('✗ Error adding is_main_branch:', error.message);
      }
    }

    // Step 4: Create new tables
    console.log('\nStep 3: Creating new tables...');
    
    try {
      await sequelize.query(`
        CREATE TABLE lab_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lab_id INT NOT NULL,
          setting_key VARCHAR(100) NOT NULL,
          setting_value TEXT,
          setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE,
          UNIQUE KEY unique_lab_setting (lab_id, setting_key)
        )
      `);
      console.log('✓ Created lab_settings table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('→ lab_settings table already exists');
      } else {
        console.error('✗ Error creating lab_settings table:', error.message);
      }
    }

    try {
      await sequelize.query(`
        CREATE TABLE lab_activity_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lab_id INT NOT NULL,
          user_id INT,
          user_role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id INT,
          details JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created lab_activity_log table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('→ lab_activity_log table already exists');
      } else {
        console.error('✗ Error creating lab_activity_log table:', error.message);
      }
    }

    // Step 5: Add foreign key constraints
    console.log('\nStep 4: Adding foreign key constraints...');
    const foreignKeys = [
      "ALTER TABLE patient ADD CONSTRAINT fk_patient_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE bill ADD CONSTRAINT fk_bill_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE bill ADD CONSTRAINT fk_bill_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE",
      "ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE",
      "ALTER TABLE employee ADD CONSTRAINT fk_employee_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE contract ADD CONSTRAINT fk_contract_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE packages_and_offers ADD CONSTRAINT fk_packages_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE payment_method ADD CONSTRAINT fk_payment_method_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE company ADD CONSTRAINT fk_company_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE",
      "ALTER TABLE doctor ADD CONSTRAINT fk_doctor_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE"
    ];

    for (let i = 0; i < foreignKeys.length; i++) {
      try {
        await sequelize.query(foreignKeys[i]);
        console.log(`✓ Added foreign key constraint ${i + 1}`);
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log(`→ Foreign key constraint ${i + 1} already exists`);
        } else {
          console.error(`✗ Error adding foreign key constraint ${i + 1}:`, error.message);
        }
      }
    }

    // Step 6: Add indexes
    console.log('\nStep 5: Adding indexes...');
    const indexes = [
      "CREATE INDEX idx_patient_lab ON patient(lab_id)",
      "CREATE INDEX idx_bill_lab ON bill(lab_id)",
      "CREATE INDEX idx_bill_branch ON bill(branch_id)",
      "CREATE INDEX idx_medical_report_lab ON medical_report(lab_id)",
      "CREATE INDEX idx_medical_report_branch ON medical_report(branch_id)",
      "CREATE INDEX idx_employee_lab ON employee(lab_id)",
      "CREATE INDEX idx_contract_lab ON contract(lab_id)",
      "CREATE INDEX idx_packages_lab ON packages_and_offers(lab_id)",
      "CREATE INDEX idx_payment_method_lab ON payment_method(lab_id)",
      "CREATE INDEX idx_company_lab ON company(lab_id)",
      "CREATE INDEX idx_doctor_lab ON doctor(lab_id)",
      "CREATE INDEX idx_branch_main ON branch(is_main_branch)",
      "CREATE INDEX idx_lab_tenant ON lab(tenant_id)",
      "CREATE INDEX idx_lab_subdomain ON lab(subdomain)",
      "CREATE INDEX idx_lab_settings_lab ON lab_settings(lab_id)",
      "CREATE INDEX idx_lab_activity_lab ON lab_activity_log(lab_id)",
      "CREATE INDEX idx_lab_activity_user ON lab_activity_log(user_id)",
      "CREATE INDEX idx_lab_activity_created ON lab_activity_log(created_at)"
    ];

    for (let i = 0; i < indexes.length; i++) {
      try {
        await sequelize.query(indexes[i]);
        console.log(`✓ Added index ${i + 1}`);
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log(`→ Index ${i + 1} already exists`);
        } else {
          console.error(`✗ Error adding index ${i + 1}:`, error.message);
        }
      }
    }

    // Step 7: Update existing data
    console.log('\nStep 6: Updating existing data...');
    try {
      await sequelize.query("UPDATE patient SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated patient lab_id');
    } catch (error) {
      console.error('✗ Error updating patient lab_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE bill SET lab_id = (SELECT id FROM lab LIMIT 1), branch_id = (SELECT id FROM branch LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated bill lab_id and branch_id');
    } catch (error) {
      console.error('✗ Error updating bill lab_id and branch_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE medical_report SET lab_id = (SELECT id FROM lab LIMIT 1), branch_id = (SELECT id FROM branch LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated medical_report lab_id and branch_id');
    } catch (error) {
      console.error('✗ Error updating medical_report lab_id and branch_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE employee SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated employee lab_id');
    } catch (error) {
      console.error('✗ Error updating employee lab_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE contract SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated contract lab_id');
    } catch (error) {
      console.error('✗ Error updating contract lab_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE packages_and_offers SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated packages_and_offers lab_id');
    } catch (error) {
      console.error('✗ Error updating packages_and_offers lab_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE payment_method SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated payment_method lab_id');
    } catch (error) {
      console.error('✗ Error updating payment_method lab_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE company SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated company lab_id');
    } catch (error) {
      console.error('✗ Error updating company lab_id:', error.message);
    }

    try {
      await sequelize.query("UPDATE doctor SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL");
      console.log('✓ Updated doctor lab_id');
    } catch (error) {
      console.error('✗ Error updating doctor lab_id:', error.message);
    }

    // Step 8: Set main branches
    try {
      await sequelize.query("UPDATE branch SET is_main_branch = TRUE WHERE id IN (SELECT MIN(id) FROM branch GROUP BY lab_id)");
      console.log('✓ Set main branches');
    } catch (error) {
      console.error('✗ Error setting main branches:', error.message);
    }

    console.log('\n✅ Simple multi-tenant migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runSimpleMigration();
}

module.exports = runSimpleMigration; 