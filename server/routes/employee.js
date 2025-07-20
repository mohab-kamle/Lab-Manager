const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const rateLimit = require('express-rate-limit');

// Rate limiter for login to mitigate brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // limit each IP to 10 requests per windowMs
  standardHeaders: true,    // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." }
});

const { employee, sequelize } = require('../models');
const { sign } = require('jsonwebtoken');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

// Employee login
router.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const emp = await employee.findOne({ where: { username :username} });
  
      if (!emp) {
        return res.status(401).json({ error: "User not found" });
      }
  
      const passwordMatch = await bcrypt.compare(password, emp.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Incorrect password" });
      }
  
      const token = sign({ id: emp.id, role: emp.role }, SECRET_KEY, { expiresIn: "3h" });

      // Exclude sensitive fields before sending the user object
      const { password: _password, ...safeUser } = emp.get({ plain: true });
      res.json({ token, user: safeUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
});

// Get all employees (admin only)
router.get("/", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const employees = await employee.findAll({
            attributes: ['id', 'name', 'username', 'email', 'gender', 'birth_date', 'national_id', 'nationality', 'passport_no', 'role'],
            order: [['name', 'ASC']]
        });
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get employee by ID (admin only)
router.get("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const emp = await employee.findByPk(id, {
            attributes: ['id', 'name', 'username', 'email', 'gender', 'birth_date', 'national_id', 'nationality', 'passport_no', 'role']
        });
        
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }
        
        res.json(emp);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create new employee (admin only)
router.post("/", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { 
            name, 
            username, 
            password, 
            email, 
            gender, 
            birth_date, 
            national_id, 
            nationality, 
            passport_no, 
            role 
        } = req.body;

        // Validate required fields
        if (!name || !username || !password || !role) {
            return res.status(400).json({ error: "Name, username, password, and role are required" });
        }

        // Validate role
        const validRoles = ['admin', 'receptionist', 'chemist', 'doctor', 'employee'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role. Must be one of: " + validRoles.join(', ') });
        }

        // Check if username already exists
        const existingUser = await employee.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Check if national_id already exists (if provided)
        if (national_id) {
            const existingNationalId = await employee.findOne({ where: { national_id } });
            if (existingNationalId) {
                return res.status(400).json({ error: "National ID already exists" });
            }
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create employee
        const newEmployee = await employee.create({
            name,
            username,
            password: hashedPassword,
            email: email || null,
            gender: gender || null,
            birth_date: birth_date || null,
            national_id: national_id || null,
            nationality: nationality || null,
            passport_no: passport_no || null,
            role
        });

        // Create role-specific record based on the role
        switch (role) {
            case 'admin':
                await sequelize.models.admin.create({
                    id: newEmployee.id
                });
                break;
            case 'chemist':
                await sequelize.models.chemist.create({
                    id: newEmployee.id,
                    no_of_reports: 0
                });
                break;
            case 'receptionist':
                await sequelize.models.receptionist.create({
                    id: newEmployee.id,
                    no_of_bills: 0
                });
                break;
            case 'doctor':
                // Doctor table has auto-incrementing ID, so we create a separate record
                // The doctor table is independent of the employee table
                await sequelize.models.doctor.create({
                    name: newEmployee.name,
                    email: newEmployee.email,
                    gender: newEmployee.gender,
                    birth_date: newEmployee.birth_date,
                    national_id: newEmployee.national_id,
                    nationality: newEmployee.nationality,
                    passport_no: newEmployee.passport_no
                });
                break;
            case 'employee':
                // Basic employee doesn't need additional table
                break;
            default:
                console.warn(`Unknown role: ${role}`);
        }

        // Return employee without password
        const { password: _, ...employeeData } = newEmployee.toJSON();
        res.status(201).json(employeeData);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update employee (admin only)
router.put("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            username, 
            password, 
            email, 
            gender, 
            birth_date, 
            national_id, 
            nationality, 
            passport_no, 
            role 
        } = req.body;

        // Find employee
        const emp = await employee.findByPk(id);
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Validate role if provided
        if (role) {
            const validRoles = ['admin', 'receptionist', 'chemist', 'doctor', 'employee'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: "Invalid role. Must be one of: " + validRoles.join(', ') });
            }
        }

        // Check if username already exists (if changed)
        if (username && username !== emp.username) {
            const existingUser = await employee.findOne({ where: { username } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }
        }

        // Check if national_id already exists (if changed)
        if (national_id && national_id !== emp.national_id) {
            const existingNationalId = await employee.findOne({ where: { national_id } });
            if (existingNationalId) {
                return res.status(400).json({ error: "National ID already exists" });
            }
        }

        // Prepare update data
        const updateData = {
            name: name || emp.name,
            username: username || emp.username,
            email: email !== undefined ? email : emp.email,
            gender: gender || emp.gender,
            birth_date: birth_date || emp.birth_date,
            national_id: national_id || emp.national_id,
            nationality: nationality || emp.nationality,
            passport_no: passport_no || emp.passport_no,
            role: role || emp.role
        };

        // Hash password if provided
        if (password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }

        // Update employee
        await emp.update(updateData);

        // Handle role changes - delete old role record and create new one
        if (role && role !== emp.role) {
            // Delete old role record
            const oldRole = emp.role;
            switch (oldRole) {
                case 'admin':
                    await sequelize.models.admin.destroy({ where: { id: emp.id } });
                    break;
                case 'chemist':
                    await sequelize.models.chemist.destroy({ where: { id: emp.id } });
                    break;
                case 'receptionist':
                    await sequelize.models.receptionist.destroy({ where: { id: emp.id } });
                    break;
                            case 'doctor':
                // Find and delete doctor record by matching employee data
                await sequelize.models.doctor.destroy({ 
                    where: { 
                        name: emp.name,
                        national_id: emp.national_id 
                    } 
                });
                break;
            }

            // Create new role record
            switch (role) {
                case 'admin':
                    await sequelize.models.admin.create({
                        id: emp.id
                    });
                    break;
                case 'chemist':
                    await sequelize.models.chemist.create({
                        id: emp.id,
                        no_of_reports: 0
                    });
                    break;
                case 'receptionist':
                    await sequelize.models.receptionist.create({
                        id: emp.id,
                        no_of_bills: 0
                    });
                    break;
                            case 'doctor':
                await sequelize.models.doctor.create({
                    name: emp.name,
                    email: emp.email,
                    gender: emp.gender,
                    birth_date: emp.birth_date,
                    national_id: emp.national_id,
                    nationality: emp.nationality,
                    passport_no: emp.passport_no
                });
                break;
                case 'employee':
                    // Basic employee doesn't need additional table
                    break;
            }
        }

        // Return updated employee without password
        const { password: _, ...employeeData } = emp.toJSON();
        res.json(employeeData);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Delete employee (admin only)
router.delete("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: "Cannot delete your own account" });
        }

        const emp = await employee.findByPk(id);
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Delete role-specific record first
        const role = emp.role;
        switch (role) {
            case 'admin':
                await sequelize.models.admin.destroy({ where: { id: emp.id } });
                break;
            case 'chemist':
                await sequelize.models.chemist.destroy({ where: { id: emp.id } });
                break;
            case 'receptionist':
                await sequelize.models.receptionist.destroy({ where: { id: emp.id } });
                break;
            case 'doctor':
                // Find and delete doctor record by matching employee data
                await sequelize.models.doctor.destroy({ 
                    where: { 
                        name: emp.name,
                        national_id: emp.national_id 
                    } 
                });
                break;
        }

        // Delete employee record
        await emp.destroy();
        res.json({ message: "Employee deleted successfully" });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get available roles (admin only)
router.get("/roles/available", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const roles = [
            { value: 'admin', label: 'Administrator', description: 'Full system access' },
            { value: 'receptionist', label: 'Receptionist', description: 'Patient management, invoices, appointments' },
            { value: 'chemist', label: 'Chemist', description: 'Medical reports, test results, lab work' },
            { value: 'doctor', label: 'Doctor', description: 'Medical reports, patient data, diagnosis' },
            { value: 'employee', label: 'Employee', description: 'Basic system access' }
        ];
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get role permissions (admin only)
router.get("/roles/:role/permissions", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { role } = req.params;
        
        const permissions = {
            admin: {
                description: "Full system access",
                permissions: [
                    "Manage all employees",
                    "Manage all patients",
                    "Manage all tests and cultures",
                    "Manage all invoices and bills",
                    "Manage all medical reports",
                    "System configuration",
                    "View all analytics and reports"
                ]
            },
            receptionist: {
                description: "Front desk operations",
                permissions: [
                    "Create and manage patients",
                    "Create and manage invoices",
                    "View patient information",
                    "Manage appointments",
                    "Process payments",
                    "View basic reports"
                ]
            },
            chemist: {
                description: "Laboratory operations",
                permissions: [
                    "Manage medical reports",
                    "Enter test results",
                    "Manage cultures",
                    "View patient test data",
                    "Print reports",
                    "Manage lab inventory"
                ]
            },
            doctor: {
                description: "Medical operations",
                permissions: [
                    "View and manage medical reports",
                    "View patient data",
                    "Enter diagnoses",
                    "Manage test orders",
                    "View patient history"
                ]
            },
            employee: {
                description: "Basic system access",
                permissions: [
                    "View basic patient information",
                    "View basic reports",
                    "Limited system access"
                ]
            }
        };

        if (!permissions[role]) {
            return res.status(404).json({ error: "Role not found" });
        }

        res.json(permissions[role]);
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;