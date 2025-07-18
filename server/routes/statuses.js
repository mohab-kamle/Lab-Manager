const express = require("express");
const router = express.Router();
const { status } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");

// Get all statuses
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
    try {
        const statuses = await status.findAll({
            order: [['id', 'ASC']]
        });
        res.json(statuses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create a new status
router.post("/", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { state, details } = req.body;
        
        if (!state) {
            return res.status(400).json({ error: "Status state is required" });
        }

        const newStatus = await status.create({
            state,
            details
        });

        res.status(201).json(newStatus);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update a status
router.put("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { state, details } = req.body;

        const statusRecord = await status.findByPk(id);
        if (!statusRecord) {
            return res.status(404).json({ error: "Status not found" });
        }

        await statusRecord.update({
            state: state || statusRecord.state,
            details: details !== undefined ? details : statusRecord.details
        });

        res.json(statusRecord);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Delete a status
router.delete("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;

        const statusRecord = await status.findByPk(id);
        if (!statusRecord) {
            return res.status(404).json({ error: "Status not found" });
        }

        // Check if status is being used in any invoices
        const { bill } = require("../models");
        const invoicesUsingStatus = await bill.count({
            where: { status_id: id }
        });

        if (invoicesUsingStatus > 0) {
            return res.status(400).json({ 
                error: `Cannot delete status. It is being used by ${invoicesUsingStatus} invoice(s).` 
            });
        }

        await statusRecord.destroy();
        res.json({ success: true, message: "Status deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router; 