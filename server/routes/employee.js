const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { loginLimiter } = require('../middleware/rateLimiters');

const { employee, admin, sequelize } = require('../models'); 
const { sign } = require('jsonwebtoken');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');
const { validatePassword } = require('../utils/passwordValidator');

// Employee login
router.post("/login", loginLimiter, async (req, res) => {
    const { username, password, lab_id } = req.body;

    // Validate inputs to prevent object injection
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: "Invalid username format" });
    }

    if (lab_id && typeof lab_id === 'object') {
        return res.status(400).json({ error: "Invalid lab ID format" });
    }
  
    try {
      // For login, we need to check if the employee exists in the specified lab
      // or find them across all labs if lab_id is not provided
      let emp;
      
      if (lab_id) {
        // If lab_id is provided, check in that specific lab
        emp = await employee.findOne({ 
          where: { 
            username: username,
            lab_id: lab_id 
          } 
        });
      } else {
        // If no lab_id provided, find the employee 
        emp = await employee.findOne({ 
          where: { username: username } 
        });
      }
  
      if (!emp) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const passwordMatch = await bcrypt.compare(password, emp.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Incorrect password" });
      }
      
      // Generate token with lab_id included
      const token = sign({ 
        id: emp.id, 
        role: emp.role,
        lab_id: emp.lab_id 
      }, SECRET_KEY, { expiresIn: "6h" });

      // Exclude sensitive fields before sending the user object
      const { password: _password, ...safeUser } = emp.get({ plain: true });
      
      if(emp.role !== "admin"){
        res.json({ token, user: safeUser});
      } else {
                console.log("isFirstTimeLogin");

        let adminObj = await admin.findByPk(emp.id)
        let isFirstTimeLogin = adminObj.isFirstTimeLogin;
        res.json({ token, user: safeUser, isFirstTimeLogin});
      }

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
});

// Change password (admins only!)
router.put("/changePassword", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const { 
            oldPassword,
            newPassword
        } = req.body;

        // Find employee
        const emp = await employee.findByPk(req.user.id);
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }

        //check if old password is the same as the one provided
        const passwordMatch = await bcrypt.compare(oldPassword, emp.password);

        if (!passwordMatch) {
            // Return passwords mismatch 
            return res.status(400).json({ error: "Wrong old password!" });
        } else {
            // Validate new password strength
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({ error: passwordValidation.error });
            }

            // Hash new password
            const saltRounds = 10;
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

            // Update employee
            await emp.update({password: hashedNewPassword});

            // Change login Status for admins
            if(req.user.role === 'admin'){
                const adminObj = await admin.findByPk(req.user.id);
                if(adminObj.isFirstTimeLogin) await adminObj.update({isFirstTimeLogin: false});
            }

            // Return updated employee without password
            const { password: _, ...employeeData } = emp.toJSON();
            res.json(employeeData);
        }

    } catch (error) {

        console.error('Error updating employee:', error);
        res.status(500).json({ error: "Internal server error" });

    }
});

// Skip password change (admins only!)
router.put("/skip-password-change", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        // Find employee
        const emp = await employee.findByPk(req.user.id);
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Change login Status for admins
        if(req.user.role === 'admin'){
            const adminObj = await admin.findByPk(req.user.id);
            if(adminObj.isFirstTimeLogin) await adminObj.update({isFirstTimeLogin: false});
        }

        res.json({ message: "Password change skipped successfully" });

    } catch (error) {
        console.error('Error skipping password change:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get all employees (admin only)
router.get("/", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const employees = await employee.findAll({
            attributes: ['id', 'name', 'username', 'email', 'gender', 'birth_date', 'national_id', 'nationality', 'passport_no', 'role'],
            include: [
                {
                    model: sequelize.models.branch_has_employee,
                    as: 'branch_has_employees',
                    include: [
                        {
                            model: sequelize.models.branch,
                            as: 'branch',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ],
            order: [['name', 'ASC']],
            where: {
                lab_id: req.tenant.lab_id
            }
        });

        // Flatten the structure for the frontend
        const result = employees.map(emp => {
            const empData = emp.toJSON();
            // Assuming an employee belongs to one branch for now as per UI
            const branchRelationship = empData.branch_has_employees && empData.branch_has_employees[0];
            
            return {
                ...empData,
                branch_id: branchRelationship ? branchRelationship.branch_id : null,
                branch_name: branchRelationship && branchRelationship.branch ? branchRelationship.branch.name : null,
                // Remove the nested object to keep payload clean
                branch_has_employees: undefined 
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get employee by ID (admin or self)
router.get("/:id", authenticateUser, tenantContext, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ensure user is admin OR requesting their own profile
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: "Access denied. You can only view your own profile." });
        }

        const emp = await employee.findByPk(id, {
            attributes: ['id', 'name', 'username', 'email', 'gender', 'birth_date', 'national_id', 'nationality', 'passport_no', 'role'],
            where: {
                lab_id: req.tenant.lab_id
            }
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
router.post("/", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
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
            role,
            branch_id
        } = req.body;
        
        // Validate required fields
        if (!name || !username || !password || !role || !branch_id) {
            return res.status(400).json({ error: "Name, username, password, role, and branch are required" });
        }

        // Validate role
        const validRoles = ['admin', 'receptionist', 'chemist', 'doctor', 'employee'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role. Must be one of: " + validRoles.join(', ') });
        }

        // Check if username already exists
        const existingUser = await employee.findOne({ where: {  username , lab_id: req.tenant.lab_id } });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Check if national_id already exists (if provided)
        if (national_id) {
            const existingNationalId = await employee.findOne({ where: {  national_id , lab_id: req.tenant.lab_id } });
            if (existingNationalId) {
                return res.status(400).json({ error: "National ID already exists" });
            }
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
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
            role,
            lab_id: req.tenant.lab_id
        });

        // Assign employee to branch
        await sequelize.models.branch_has_employee.create({
            branch_id: branch_id,
            employee_id: newEmployee.id
        });

        // Create role-specific record based on the role
        switch (role) {
            case 'admin':
                await sequelize.models.admin.create({
                    id: newEmployee.id,
                    lab_id: req.tenant.lab_id
                });
                break;
            case 'chemist':
                await sequelize.models.chemist.create({
                    id: newEmployee.id,
                    no_of_reports: 0,
                    lab_id: req.tenant.lab_id
                });
                break;
            case 'receptionist':
                await sequelize.models.receptionist.create({
                    id: newEmployee.id,
                    no_of_bills: 0,
                    lab_id: req.tenant.lab_id
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
                    passport_no: newEmployee.passport_no,
                    lab_id: req.tenant.lab_id
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

// Update employee (admin or self)
router.put("/:id", authenticateUser, tenantContext, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ensure user is admin OR updating their own profile
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: "Access denied. You can only update your own profile." });
        }

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
            role,
            branch_id
        } = req.body;

        // Find employee
        const emp = await employee.findByPk(id);
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Validate role if provided (Only admin can change roles)
        if (role && role !== emp.role) {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: "Access denied. Only admins can change roles." });
            }
            const validRoles = ['admin', 'receptionist', 'chemist', 'doctor', 'employee'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: "Invalid role. Must be one of: " + validRoles.join(', ') });
            }
        }

        // Check if username already exists (if changed)
        if (username && username !== emp.username) {
            const existingUser = await employee.findOne({ where: {  username , lab_id: req.tenant.lab_id } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }
        }

        // Check if national_id already exists (if changed)
        if (national_id && national_id !== emp.national_id) {
            const existingNationalId = await employee.findOne({ where: {  national_id , lab_id: req.tenant.lab_id } });
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
            role: (req.user.role === 'admin' && role) ? role : emp.role
        };

        // Hash password if provided
        if (password) {
            // Validate password strength
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({ error: passwordValidation.error });
            }

            const saltRounds = 10;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }

        // Update employee
        await emp.update(updateData);

        // Update branch assignment if branch_id is provided (Only admin can change branches)
        if (branch_id && req.user.role === 'admin') {
            const BranchHasEmployee = sequelize.models.branch_has_employee;
            await BranchHasEmployee.destroy({ where: { employee_id: emp.id } });
            await BranchHasEmployee.create({ branch_id: branch_id, employee_id: emp.id });
        }

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
                        id: emp.id,
                        lab_id: req.tenant.lab_id
                    });
                    break;
                case 'chemist':
                    await sequelize.models.chemist.create({
                        id: emp.id,
                        no_of_reports: 0,
                        lab_id: req.tenant.lab_id
                    });
                    break;
                case 'receptionist':
                    await sequelize.models.receptionist.create({
                        id: emp.id,
                        no_of_bills: 0,
                        lab_id: req.tenant.lab_id
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
                        passport_no: emp.passport_no,
                        lab_id: req.tenant.lab_id
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
router.delete("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
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

        // Delete from branch_has_employee
        await sequelize.models.branch_has_employee.destroy({
             where: { employee_id: emp.id }
        });

        // Delete employee record
        await emp.destroy();
        res.json({ message: "Employee deleted successfully" });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get available roles (admin only)
router.get("/roles/available", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
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
router.get("/roles/:role/permissions", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
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