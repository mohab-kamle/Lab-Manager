const express = require('express');
const router = express.Router();
require("dotenv").config();
const { payment_method } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');

// GET: Fetch all payment methods
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), tenantContext, async (req, res) => {
    try {
        const paymentMethodsList = await payment_method.findAll();
        res.json(paymentMethodsList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// POST: Add a new payment method
router.post("/", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Payment method name is required" });
        }

        const newPaymentMethod = await payment_method.create({ name, lab_id: req.tenant.lab_id });
        res.status(201).json(newPaymentMethod);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add payment method" });
    }
});

// PUT: Update a payment method
router.put("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Payment method name is required" });
        }

        const existingMethod = await payment_method.findByPk(id);
        if (!existingMethod) {
            return res.status(404).json({ error: "Payment method not found" });
        }

        existingMethod.name = name;
        await existingMethod.save(); // Save the updated method in the database

        res.json({ message: "Payment method updated successfully", paymentMethod: existingMethod });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update payment method" });
    }
});

module.exports = router;
