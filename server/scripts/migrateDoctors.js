require('dotenv').config();
const { sequelize, employee, doctor, lab_contracts_doctor, contract, branch_has_employee } = require('../models');

sequelize.authenticate().then(() => {
    console.log('Database connection has been established successfully.');
}).catch((err) => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
});



async function migrateDoctors() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🔄 Starting Doctor Migration...');

        // 1. Sync Doctor table to ensure new columns exist
        // Note: We rely on the app's sync or run this manually. 
        // For this script, we assume the model update has been applied or will be applied by sync() call here.
        await sequelize.models.doctor.sync({ alter: true });
        console.log('✅ Doctor table schema synced.');

        // 2. Get all employees with role 'doctor'
        const doctorEmployees = await employee.findAll({
            where: { role: 'doctor' }
        });
        console.log(`📊 Found ${doctorEmployees.length} doctors to migrate.`);

        // 3. Ensure a default contract exists
        let defaultContract = await contract.findOne({ where: { name: 'Standard Doctor Contract' } });
        if (!defaultContract) {
            defaultContract = await contract.create({
                name: 'Standard Doctor Contract',
                discount_type: 'none',
                details: 'Auto-generated contract for migrated doctors'
            }, { transaction });
            console.log('✅ Created default contract.');
        }

        for (const emp of doctorEmployees) {
            console.log(`Processing doctor: ${emp.username} (${emp.name})`);

            // 4. Find or Create Doctor record
            // We match by national_id first, then name+lab? 
            // Since we removed lab_id from doctor, we match by national_id assuming it's unique.
            // If national_id is null, we rely on name? That's risky.
            // Let's assume national_id is present or fall back to passport_no, then name.

            let doc = null;
            if (emp.national_id) {
                doc = await doctor.findOne({ where: { national_id: emp.national_id } });
            } else if (emp.passport_no) {
                doc = await doctor.findOne({ where: { passport_no: emp.passport_no } });
            }

            const doctorData = {
                name: emp.name,
                username: emp.username,
                password: emp.password, // Already hashed
                email: emp.email,
                gender: emp.gender,
                birth_date: emp.birth_date,
                national_id: emp.national_id,
                nationality: emp.nationality,
                passport_no: emp.passport_no
            };

            if (doc) {
                // Update existing doctor with credentials
                await doc.update(doctorData, { transaction });
                console.log(`   Updated existing doctor record ID: ${doc.id}`);
            } else {
                // Create new doctor
                doc = await doctor.create(doctorData, { transaction });
                console.log(`   Created new doctor record ID: ${doc.id}`);
            }

            // 5. Create Lab Contract
            // Check if contract already exists
            const existingContract = await lab_contracts_doctor.findOne({
                where: {
                    lab_id: emp.lab_id,
                    doctor_id: doc.id
                }
            });

            if (!existingContract) {
                await lab_contracts_doctor.create({
                    lab_id: emp.lab_id,
                    doctor_id: doc.id,
                    contract_id: defaultContract.id,
                    commission: 0 // Default 0 commission
                }, { transaction });
                console.log(`   Created contract for Lab ID: ${emp.lab_id}`);
            } else {
                console.log(`   Contract already exists for Lab ID: ${emp.lab_id}`);
            }

            // 6. Delete Employee Record
            // Remove from branch_has_employee first
            await branch_has_employee.destroy({ where: { employee_id: emp.id }, transaction });
            await emp.destroy({ transaction });
            console.log(`   Deleted employee record ID: ${emp.id}`);
        }

        await transaction.commit();
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateDoctors();
