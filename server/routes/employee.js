const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { loginLimiter, forgotPasswordLimiter, verifyOtpLimiter, resetPasswordLimiter } = require('../middleware/rateLimiters');
const { lab } = require('../models');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const cacheService = require('../services/cacheService');

const { employee, admin, sequelize, branch_has_employee, branch, chemist, receptionist, doctor, phone_number } = require('../models'); 
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { sign, verify } = require('jsonwebtoken');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');
const { validatePassword } = require('../utils/passwordValidator');

// Helper function to normalize phone number to E.164 format
const normalizePhone = (phoneStr) => {
    if (!phoneStr) return null;
    try {
        const phoneNumber = parsePhoneNumberFromString(phoneStr);
        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
        if (phoneStr.startsWith('+')) return phoneStr;
        return phoneStr;
    } catch (e) {
        return phoneStr;
    }
};

// Employee login
router.post("/login", loginLimiter, async (req, res) => {
    const { username, password, lab_id } = req.body;

    // 🛡️ Validate username
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: "Invalid username format" });
    }

    // 🛡️ Validate lab_id
    let safeLabId = null;
    if (lab_id !== undefined && lab_id !== null) {
        if (typeof lab_id !== 'string' && typeof lab_id !== 'number') {
            return res.status(400).json({ error: "Invalid lab ID format" });
        }

        safeLabId = Number(lab_id);
        if (isNaN(safeLabId)) {
            return res.status(400).json({ error: "Invalid lab_id format" });
        }
    }

    try {
        let emp;

        if (safeLabId !== null) {
            emp = await employee.findOne({
                where: {
                    username: username,
                    lab_id: safeLabId
                }
            });
        } else {
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

        // 🔐 Generate JWT
        const token = sign({
            id: emp.id,
            role: emp.role,
            lab_id: emp.lab_id
        }, SECRET_KEY, { expiresIn: "6h" });

        // 🧼 Remove password
        const { password: _, ...safeUser } = emp.get({ plain: true });

        if (emp.role !== "admin") {
            return res.json({ token, user: safeUser });
        }

        // 👑 Admin extra logic
        const adminObj = await admin.findByPk(emp.id);
        const isFirstTimeLogin = adminObj?.isFirstTimeLogin ?? false;

        return res.json({ token, user: safeUser, isFirstTimeLogin });

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
            await emp.update({ password: hashedNewPassword });

            // Change login Status for admins
            if (req.user.role === 'admin') {
                const adminObj = await admin.findByPk(req.user.id);
                if (adminObj.isFirstTimeLogin) await adminObj.update({ isFirstTimeLogin: false });
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
        if (req.user.role === 'admin') {
            const adminObj = await admin.findByPk(req.user.id);
            if (adminObj.isFirstTimeLogin) await adminObj.update({ isFirstTimeLogin: false });
        }

        res.json({ message: "Password change skipped successfully" });

    } catch (error) {
        console.error('Error skipping password change:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Send OTP via Email Address
router.post('/forgotPassword', forgotPasswordLimiter, async (req,res)=>{
    try{ 
        const { username } = req.body;

        // 1. Basic validation
        if (!username) {
            return res.status(400).json({ error: 'username is required' });
        }

        // 2. Find the employee
        const user = await employee.findOne({ where: {username: username} });
        if(!user || !user.email){
            return res.status(404).json(`No user with this username was found or email is missing`);
        }
        const email = user.email;

        // 3. Get lab info for the email template
        const userLab = await lab.findOne({where: {id: user.lab_id}});

        // 4. Generate the 6-digit OTP
        const otp = otpGenerator.generate(6, { 
            digits: true, 
            lowerCaseAlphabets: false, // Changed from 'alphabets'
            upperCaseAlphabets: false, // Changed from 'upperCase'
            specialChars: false 
        });

        const redisKey = cacheService.generateKey('otp', username);
        const attemptsKey = cacheService.generateKey('otp_attempts', username);

        // 5. Attempt to save to Redis FIRST
        const cacheSuccess = await cacheService.set(redisKey, otp, 600);

        // 6. If it returns false, Redis is disconnected. Abort immediately.
        if (!cacheSuccess) {
            return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });
        }

        // 7. Clear old attempts only if we know Redis is working
        await cacheService.del(attemptsKey);

        // 8. Send the email ONLY because we successfully saved the OTP
        await sendOtpEmail(email, otp, userLab.name);

        res.status(200).json(`An OTP that is valid for 10 mins has been sent to this email successfully!`);

    } catch (e){

        res.status(500).json({error: 'Internal Server error',details: e.message});

    }
});

// Verify incoming OTP
router.post('/verifyOtp', verifyOtpLimiter, async (req, res) => {
    try {
        const { username, otp } = req.body;
        if (!username || !otp) {
            return res.status(400).json({ error: 'Username and OTP are required' });
        }

        // 1. Verify Redis is actually online before attempting to read from it[cite: 6]
        if (cacheService.isConnected === false) {
             return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });
        }

        // 2. Generate the exact same key to look it up
        const redisKey = cacheService.generateKey('otp', username);
        const attemptsKey = cacheService.generateKey('otp_attempts', username);

        // 3. Use cacheService to fetch OTP
        const storedOtp = await cacheService.get(redisKey);
        if (!storedOtp) {
            return res.status(400).json({ error: 'OTP has expired or is invalid' });
        }

        // 4. Get the number of attempts
        let attempts = await cacheService.get(attemptsKey) || 0;
        attempts = parseInt(attempts);

        // 5. Check if attempts are too high
        if (attempts >= 4) {
            await cacheService.del(redisKey);
            await cacheService.del(attemptsKey);
            return res.status(429).json({ error: 'Maximum attempts reached. Please request a new OTP.' });
        }

        // 6. Check if the submitted OTP matches the stored OTP
        if (storedOtp.toString() !== otp.toString()) {
            await cacheService.set(attemptsKey, attempts + 1, 600);
            return res.status(400).json({ error: `Incorrect OTP. You have ${4 - attempts} attempts left.` });
        }
        
        // 7. Success! Delete the OTP and attempts from the cache
        await cacheService.del(redisKey);
        await cacheService.del(attemptsKey);
        
        // 8. Generate the JWT
        const resetToken =sign(
            {
                username: username,
                purpose: "password_reset" // Important to differentiate from a regular login token
            },
            SECRET_KEY,
            { expiresIn: '15m' } // Token expires in 15 minutes
        );

        // 9. Return the token to the frontend
        res.json({
            success: true,
            message: 'OTP verified successfully.',
            resetToken: resetToken
        });
    } catch (e) {
        console.error('Verify OTP error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset password (Public endpoint, no 'authenticateUser' middleware)
router.post("/resetPassword", resetPasswordLimiter, async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        // 1. Basic payload validation
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: "Token and new password are required" });
        }

        // 2. Verify the JWT token
        let decodedToken;
        try {
            decodedToken = verify(resetToken, SECRET_KEY);
        } catch (err) {
            // Catches both expired tokens and tampered tokens
            return res.status(401).json({ error: "Invalid or expired reset token. Please request a new OTP." });
        }

        // 3. Ensure this token was specifically made for resetting passwords
        if (decodedToken.purpose !== "password_reset") {
            return res.status(401).json({ error: "Invalid token type." });
        }

        // 4. Find employee by the email extracted from the token payload
        const emp = await employee.findOne({ where: { username: decodedToken.username } });
        if (!emp) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // 5. Check if the new password is the same as the old password
        const passwordMatch = await bcrypt.compare(newPassword, emp.password);
        if (passwordMatch) {
            return res.status(401).json({ error: "New password cannot be the same as old password." });
        }

        // 6. Validate new password strength (using your existing utility)
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // 7. Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // 8. Update employee
        await emp.update({ password: hashedNewPassword });

        // // Optional: Change login Status for admins (ported from your changePassword code)
        // if (emp.role === 'admin') {
        //     const adminObj = await admin.findByPk(emp.id);
        //     if (adminObj && adminObj.isFirstTimeLogin) {
        //         await adminObj.update({ isFirstTimeLogin: false });
        //     }
        // }

        // 9. Return success response format expected by Ziad[cite: 1]
        res.json({
            success: true,
            message: "Password has been reset successfully."
        });

    } catch (error) {
        console.error('Error resetting password:', error);
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
                    model: branch_has_employee,
                    as: 'branch_has_employees',
                    include: [
                        {
                            model: branch,
                            as: 'branch',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: phone_number,
                    as: 'phones'
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

// Get employee by ID (admin only)
router.get("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const { id } = req.params;
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
            branch_id,
            phoneNumbers = [] // Array of { phone, type, is_primary }
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
        const existingUser = await employee.findOne({ where: { username, lab_id: req.tenant.lab_id } });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Check if national_id already exists (if provided)
        if (national_id) {
            const existingNationalId = await employee.findOne({ where: { national_id, lab_id: req.tenant.lab_id } });
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
        await branch_has_employee.create({
            branch_id,
            employee_id: newEmployee.id
        });

        // Add phone numbers
        if (phoneNumbers && phoneNumbers.length > 0) {
            const phonesToCreate = phoneNumbers.map(p => {
                const normalized = normalizePhone(p.phone);
                return normalized ? {
                    phone: normalized,
                    type: p.type || 'personal',
                    is_primary: p.is_primary || false,
                    employee_id: newEmployee.id
                } : null;
            }).filter(p => p !== null);

            if (phonesToCreate.length > 0) {
                // Ensure primary
                if (!phonesToCreate.some(p => p.is_primary)) {
                    phonesToCreate[0].is_primary = true;
                }
                await phone_number.bulkCreate(phonesToCreate);
            }
        }

        if (role === "admin") {
            await admin.create({
                id: newEmployee.id,
                isFirstTimeLogin: true,
                lab_id: req.tenant.lab_id
            });
        } else if (role === "chemist") {
            await chemist.create({
                id: newEmployee.id,
                no_of_reports: 0,
                lab_id: req.tenant.lab_id
            });
        } else if (role === "receptionist") {
            await receptionist.create({
                id: newEmployee.id,
                no_of_bills: 0,
                lab_id: req.tenant.lab_id
            });
        } else if (role === "doctor") {
            await doctor.create({
                name: newEmployee.name,
                email: newEmployee.email,
                gender: newEmployee.gender,
                birth_date: newEmployee.birth_date,
                national_id: newEmployee.national_id,
                nationality: newEmployee.nationality,
                passport_no: newEmployee.passport_no,
                lab_id: req.tenant.lab_id
            });
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
router.put("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
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
            role,
            branch_id,
            phoneNumbers = [] // Array of { phone, type, is_primary }
        } = req.body;

        // Find employee
        const emp = await employee.findOne({ where: { id, lab_id: req.tenant.lab_id } });
        if (!emp) {
            return res.status(404).json({ error: "Employee not found or you don't have permission to edit this employee." });
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
            const existingUser = await employee.findOne({ where: { username, lab_id: req.tenant.lab_id } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }
        }

        // Check if national_id already exists (if changed)
        if (national_id && national_id !== emp.national_id) {
            const existingNationalId = await employee.findOne({ where: { national_id, lab_id: req.tenant.lab_id } });
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

        // Update branch assignment if branch_id is provided
        if (branch_id) {
            await branch_has_employee.destroy({ where: { employee_id: emp.id } });
            await branch_has_employee.create({ branch_id: branch_id, employee_id: emp.id });
        }

        // Update phone numbers
        if (phoneNumbers !== undefined) {
            await phone_number.destroy({ where: { employee_id: emp.id } });
            const phonesToCreate = phoneNumbers.map(p => {
                const normalized = normalizePhone(p.phone);
                return normalized ? {
                    phone: normalized,
                    type: p.type || 'personal',
                    is_primary: p.is_primary || false,
                    employee_id: emp.id
                } : null;
            }).filter(p => p !== null);

            if (phonesToCreate.length > 0) {
                if (!phonesToCreate.some(p => p.is_primary)) {
                    phonesToCreate[0].is_primary = true;
                }
                await phone_number.bulkCreate(phonesToCreate);
            }
        }

        // Handle role changes - delete old role record and create new one
        if (role && role !== emp.role) {
            // Delete old role record
            const oldRole = emp.role;
            switch (oldRole) {
                case 'admin':
                    await admin.destroy({ where: { id: emp.id } });
                    break;
                case 'chemist':
                    await chemist.destroy({ where: { id: emp.id } });
                    break;
                case 'receptionist':
                    await receptionist.destroy({ where: { id: emp.id } });
                    break;
                case 'doctor':
                    // Find and delete doctor record by matching employee data
                    await doctor.destroy({ 
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
                    await admin.create({
                        id: emp.id,
                        isFirstTimeLogin: true,
                        lab_id: req.tenant.lab_id
                    });
                    break;
                case 'chemist':
                    await chemist.create({
                        id: emp.id,
                        no_of_reports: 0,
                        lab_id: req.tenant.lab_id
                    });
                    break;
                case 'receptionist':
                    await receptionist.create({
                        id: emp.id,
                        no_of_bills: 0,
                        lab_id: req.tenant.lab_id
                    });
                    break;
                case 'doctor':
                    await doctor.create({
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

        const emp = await employee.findOne({ where: { id, lab_id: req.tenant.lab_id } });
        if (!emp) {
            return res.status(404).json({ error: "Employee not found or you don't have permission to delete this employee." });
        }

        // Delete role-specific record first
        if (emp.role === 'admin') {
            await admin.destroy({ where: { id: emp.id } });
        } else if (emp.role === 'chemist') {
            await chemist.destroy({ where: { id: emp.id } });
        } else if (emp.role === 'receptionist') {
            await receptionist.destroy({ where: { id: emp.id } });
        } else if (emp.role === 'doctor') {
            await doctor.destroy({ 
                where: { 
                    name: emp.name,
                    lab_id: emp.lab_id
                } 
            });
        }

        // Delete branch assignment
        await branch_has_employee.destroy({
            where: { employee_id: id }
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

// Configure email transporter
var transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true, // use SSL
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
  }
});

////FOR TESTING PURPOPSES
// let transporter;
// // Replace your Zoho/Gmail transporter with this:
// nodemailer.createTestAccount((err, account) => {
//     if (err) {
//         console.error('Failed to create a testing account. ' + err.message);
//         return process.exit(1);
//     }

//      transporter = nodemailer.createTransport({
//         host: account.smtp.host,
//         port: account.smtp.port,
//         secure: account.smtp.secure,
//         auth: {
//             user: account.user,
//             pass: account.pass
//         }
//     });

// });

const sendOtpEmail = async (email, otpCode, labName = 'Smart LIMS') => {
    try{
        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #007bff; text-align: center;">${labName}</h2>
        <p style="color: #333; font-size: 16px;">Hello,</p>
        <p style="color: #333; font-size: 16px;">We received a request to reset the password for your account. Here is your One-Time Password (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; padding: 10px 20px; background-color: #f4f4f4; border-radius: 4px;">
            ${otpCode}
            </span>
        </div>
        <p style="color: #d9534f; font-size: 14px; text-align: center;">
            <em>This code is valid for the next 10 minutes.</em>
        </p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="color: #6c757d; font-size: 12px; text-align: center;">
            If you did not request a password reset, please ignore this email or contact your lab administrator immediately.
        </p>
        </div>
    `;
    // FOR TESTING PURPOPSES
    // const info = await transporter.sendMail({
    //     from: process.env.EMAIL_USER || 'noreply@labmanager.com',
    //     to: email,
    //     subject: 'Your Password Reset Code',
    //     html: htmlContent
    // });
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@labmanager.com',
        to: email,
        subject: 'Your Password Reset Code',
        html: htmlContent
    });
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email. Please try again later.'); // Throw to stop the route
    // Don't fail the request if email fails
  }
};

module.exports = router;