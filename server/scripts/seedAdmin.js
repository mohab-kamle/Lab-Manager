const bcrypt = require('bcryptjs');
const { employee, admin } = require('../models'); // Ensure the correct path

const createAdmin = async () => {
    try {
        const username = 'ab123'; // Change if needed
        const plainPassword = 'admin123'; // Change if needed
        const hashedPassword = await bcrypt.hash(plainPassword, 10); // Hash password

        // Insert employee
        const newEmployee = await employee.create({ username, password: hashedPassword , role: 'admin' });

        // Insert into admin table using the employee's ID
        await admin.create({ id: newEmployee.id });

        console.log('Admin user created successfully!');
        process.exit();
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
