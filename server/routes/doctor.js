const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { doctor, lab_contracts_doctor, contract, sequelize } = require('../models');
const { loginLimiter } = require('../middleware/rateLimiters');
const authenticateUser = require('../middleware/authenticateUser');

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

module.exports = router;
