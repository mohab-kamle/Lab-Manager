'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 1. Create a default Laboratory if it doesn't exist
    const [existingLab] = await queryInterface.sequelize.query(
      "SELECT id FROM lab WHERE subdomain = 'lab1' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    let actualLabId;
    if (!existingLab) {
      await queryInterface.bulkInsert('lab', [{
        tenant_id: 'lab1',
        subdomain: 'lab1',
        path: 'lab1',
        name: 'Default Laboratory',
        region: 'Cairo',
        governorate: 'Cairo',
        license_number: '123456',
        subscription_status: 'trial',
        trial_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year trial
        created_at: new Date(),
        updated_at: new Date()
      }], {});

      const labRecord = await queryInterface.sequelize.query(
        "SELECT id FROM lab WHERE subdomain = 'lab1' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      actualLabId = labRecord[0].id;
    } else {
      actualLabId = existingLab.id;
    }

    // 2. Create an Admin Employee if it doesn't exist
    const [existingEmployee] = await queryInterface.sequelize.query(
      "SELECT id FROM employee WHERE username = 'admin' AND lab_id = :labId LIMIT 1",
      { 
        replacements: { labId: actualLabId },
        type: queryInterface.sequelize.QueryTypes.SELECT 
      }
    );

    let actualEmployeeId;
    if (!existingEmployee) {
      await queryInterface.bulkInsert('employee', [{
        lab_id: actualLabId,
        name: 'System Admin',
        username: 'admin',
        password: hashedPassword,
        email: 'admin@lab1.com',
        gender: 'Male',
        role: 'admin',
        is_owner: true
      }], {});

      const employeeRecord = await queryInterface.sequelize.query(
        "SELECT id FROM employee WHERE username = 'admin' AND lab_id = :labId LIMIT 1",
        { 
          replacements: { labId: actualLabId },
          type: queryInterface.sequelize.QueryTypes.SELECT 
        }
      );
      actualEmployeeId = employeeRecord[0].id;
    } else {
      actualEmployeeId = existingEmployee.id;
    }

    // 3. Create the Admin record if it doesn't exist
    const [existingAdmin] = await queryInterface.sequelize.query(
      "SELECT id FROM admin WHERE id = :id LIMIT 1",
      { 
        replacements: { id: actualEmployeeId },
        type: queryInterface.sequelize.QueryTypes.SELECT 
      }
    );

    if (!existingAdmin) {
      await queryInterface.bulkInsert('admin', [{
        id: actualEmployeeId,
        isFirstTimeLogin: false
      }], {});
    }

    console.log('✅ Seeding completed:');
    console.log('   - Lab: lab1.localhost');
    console.log('   - Username: admin');
    console.log('   - Password: admin123');
  },


  async down(queryInterface, Sequelize) {
    // Reverse order of deletion
    await queryInterface.bulkDelete('admin', null, {});
    await queryInterface.bulkDelete('employee', null, {});
    await queryInterface.bulkDelete('lab', null, {});
  }
};
