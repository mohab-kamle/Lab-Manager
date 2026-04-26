const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { doctor, contract, sequelize, phone_number } = require('../models');
const { loginLimiter } = require('../middleware/rateLimiters');
const authenticateUser = require('../middleware/authenticateUser');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

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

// Doctor Login
router.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        const doc = await doctor.findOne({ where: { username } });
        if (!doc) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const passwordMatch = await bcrypt.compare(password, doc.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Generate token
        const token = jwt.sign({
            id: doc.id,
            role: 'doctor' // No lab_id for doctor
        }, SECRET_KEY, { expiresIn: "12h" });

        // Return doctor info without password
        const { password: _, ...doctorData } = doc.toJSON();
        res.json({ token, user: doctorData });

    } catch (error) {
        console.error("Doctor login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Doctor Signup
router.post("/signup", loginLimiter, async (req, res) => {
    const {
        name,
        username,
        password,
        email,
        gender,
        national_id,
        specialization,
        phone
    } = req.body;

    try {
        // Validation
        if (!username || !password || !name) {
            return res.status(400).json({ error: "Name, username, and password are required" });
        }

        // Check availability
        const existingUser = await doctor.findOne({ where: { username } });
        if (existingUser) return res.status(400).json({ error: "Username already exists" });

        if (national_id) {
            const existingNID = await doctor.findOne({ where: { national_id } });
            if (existingNID) return res.status(400).json({ error: "National ID already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Doctor
        const newDoctor = await doctor.create({
            name,
            username,
            password: hashedPassword,
            email,
            gender,
            national_id,
            // specialization, // Model doesn't have specialization yet? Checking schema...
            // phone // Model doesn't have phone?
        });

        // Note: Specialization and Phone might be needed in the model if requested. 
        // For now, adhering to existing schema or what was added.

        const token = jwt.sign({ id: newDoctor.id, role: 'doctor' }, SECRET_KEY, { expiresIn: "12h" });

        const { password: _, ...doctorData } = newDoctor.toJSON();
        res.status(201).json({ token, user: doctorData });

    } catch (error) {
        console.error("Doctor signup error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Doctor Profile
router.get("/me", authenticateUser, async (req, res) => {
    try {
        const doc = await doctor.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!doc) return res.status(404).json({ error: "Doctor not found" });
        res.json(doc);
    } catch (error) {
        console.error("Error fetching doctor profile:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get all doctors with contract
router.get("/", authenticateUser, async (req, res) => {
    try {
        const docs = await doctor.findAll({
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: contract,
                    as: 'contract'
                },
                {
                    model: phone_number,
                    as: 'phones'
                }
            ]
        });
        res.json(docs);
    } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Create a new doctor (from invoice page or management)
router.post("/", authenticateUser, async (req, res) => {
    try {
        const { name, specialization, phoneNumbers = [], email, commission, contract_id } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Doctor name is required" });
        }

        const newDoctor = await doctor.create({
            name,
            specialization,
            email,
            commission: commission || 0,
            contract_id: contract_id || null
        });

        // Add phone numbers
        if (phoneNumbers && phoneNumbers.length > 0) {
            const phonesToCreate = phoneNumbers.map(p => {
                const normalized = normalizePhone(p.phone);
                return normalized ? {
                    phone: normalized,
                    type: p.type || 'personal',
                    is_primary: p.is_primary || false,
                    doctor_id: newDoctor.id
                } : null;
            }).filter(p => p !== null);

            if (phonesToCreate.length > 0) {
                if (!phonesToCreate.some(p => p.is_primary)) {
                    phonesToCreate[0].is_primary = true;
                }
                await phone_number.bulkCreate(phonesToCreate);
            }
        }

        res.status(201).json(newDoctor);
    } catch (error) {
        console.error("Error creating doctor:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
