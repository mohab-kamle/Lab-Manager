'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Disable FK checks temporarily for safe dropping
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

      // 2. Add referred_doctor_id to bill
      const billTable = await queryInterface.describeTable('bill');
      if (!billTable['referred_doctor_id']) {
        await queryInterface.addColumn('bill', 'referred_doctor_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'doctor',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      }

      // 3. Add contract_id to doctor
      const doctorTable = await queryInterface.describeTable('doctor');
      if (!doctorTable['contract_id']) {
        await queryInterface.addColumn('doctor', 'contract_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'contract',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      }

      // 4. Drop patient.referral_id column safely
      const patientTable = await queryInterface.describeTable('patient');
      if (patientTable['referral_id']) {
        // Due to MySQL auto-generated FK names, we just drop the column while FK checks are 0
        await queryInterface.removeColumn('patient', 'referral_id', { transaction });
      }

      // 5. Drop old redundant tables
      try { await queryInterface.dropTable('referral', { transaction }); } catch (e) { console.log('Skipped dropping referral table'); }
      try { await queryInterface.dropTable('lab_contracts_doctor', { transaction }); } catch (e) { console.log('Skipped dropping lab_contracts_doctor table'); }


      // 6. Re-enable FK checks
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

      // Remove added columns
      try { await queryInterface.removeColumn('bill', 'referred_doctor_id', { transaction }); } catch (e) {}
      try { await queryInterface.removeColumn('doctor', 'contract_id', { transaction }); } catch (e) {}


      // We cannot easily recreate the exact lost data for 'referral' and 'lab_contracts_doctor' in a down migration
      // but we can re-create the table schemas if necessary, omitted for simplicity 

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
