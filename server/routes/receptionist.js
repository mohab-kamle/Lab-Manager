const express = require("express");
const router = express.Router();
const { receptionist, employee, sequelize } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");

/**
 * GET /receptionists - Get all receptionists
 */
router.get("/", authenticateUser , authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const receptionists = await employee.findAll({
            where: {
                lab_id: req.tenant.lab_id,
                role: 'receptionist'
            },
            order: [['id', 'ASC']],
            include: [
                {
                    model: receptionist,
                    as: 'receptionist',
                    attributes: ['id', 'no_of_bills']
                }
            ],
            attributes: ['id', 'name', 'username', 'role']
        });

        res.json(receptionists);
    } catch (error) {
        console.error('Error fetching receptionists:', error);
        res.status(500).json({ error: "Failed to fetch receptionists" });
    }
});

/**
 * GET /receptionists/:id - Get a specific receptionist
 */
router.get("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                r.id,
                r.no_of_bills,
                e.name,
                e.username,
                e.role
            FROM receptionist AS r
            INNER JOIN employee AS e ON e.id = r.id
            WHERE r.id = :id AND r.lab_id = :labId
        `;

        const [receptionistRecord] = await sequelize.query(query, {
            replacements: { id, labId: req.tenant.lab_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!receptionistRecord) {
            return res.status(404).json({ error: "Receptionist not found" });
        }

        res.json(receptionistRecord);
    } catch (error) {
        console.error('Error fetching receptionist:', error);
        res.status(500).json({ error: "Failed to fetch receptionist" });
    }
});

/**
 * POST /receptionists - Create a new receptionist
 */
router.post("/", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { employee_id } = req.body;

        if (!employee_id) {
            return res.status(400).json({ error: "Employee ID is required" });
        }

        // Check if employee exists
        const employeeExists = await employee.findOne({ where: { id: employee_id, lab_id: req.tenant.lab_id } });
        if (!employeeExists) {
            await transaction.rollback();
            return res.status(400).json({ error: "Employee not found" });
        }

        // Check if already a receptionist in this lab
        const existingReceptionist = await receptionist.findByPk(employee_id);
        if (existingReceptionist) {
            await transaction.rollback();
            return res.status(400).json({ error: "Employee is already a receptionist" });
        }

        // Create new receptionist
        await receptionist.create({
            id: employee_id, // This assumes employee.id is the primary key and receptionist.id is a foreign key to employee.id
            lab_id: req.tenant.lab_id,
            no_of_bills: 0
        }, { transaction });

        // Update employee role
        await employee.update(
            { role: 'receptionist' },
            { 
                where: { id: employee_id },
                transaction
            }
        );

        await transaction.commit();

        // Fetch the created receptionist with employee details
        const query = `
            SELECT 
                r.id,
                r.no_of_bills,
                e.name,
                e.username,
                e.role
            FROM receptionist AS r
            INNER JOIN employee AS e ON e.id = r.id
            WHERE r.id = :id AND r.lab_id = :labId
        `;

        const [newReceptionist] = await sequelize.query(query, {
            replacements: { id: employee_id, labId: req.tenant.lab_id },
            type: sequelize.QueryTypes.SELECT
        });

        res.status(201).json(newReceptionist);
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating receptionist:', error);
        res.status(500).json({ error: "Failed to create receptionist" });
    }
});

/**
 * PUT /receptionists/:id - Update a receptionist
 */
router.put("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { no_of_bills } = req.body;

        const receptionistRecord = await receptionist.findOne({ where: { id, lab_id: req.tenant.lab_id } });
        if (!receptionistRecord) {
            return res.status(404).json({ error: "Receptionist not found" });
        }

        // Update receptionist
        await receptionistRecord.update({ no_of_bills });

        // Fetch updated data
        const query = `
            SELECT 
                r.id,
                r.no_of_bills,
                e.name,
                e.username,
                e.role
            FROM receptionist AS r
            INNER JOIN employee AS e ON e.id = r.id
            WHERE r.id = :id AND r.lab_id = :labId
        `;

        const [updatedReceptionist] = await sequelize.query(query, {
            replacements: { id, labId: req.tenant.lab_id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(updatedReceptionist);
    } catch (error) {
        console.error('Error updating receptionist:', error);
        res.status(500).json({ error: "Failed to update receptionist" });
    }
});

/**
 * DELETE /receptionists/:id - Delete a receptionist
 */
router.delete("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;

        const receptionistRecord = await receptionist.findOne({ where: { id, lab_id: req.tenant.lab_id } });
        if (!receptionistRecord) {
            await transaction.rollback();
            return res.status(404).json({ error: "Receptionist not found" });
        }

        // Update employee role back to 'employee'
        await employee.update(
            { role: 'employee' },
            {
                where: { id },
                transaction
            }
        );

        // Delete receptionist record
        await receptionistRecord.destroy({ transaction });

        await transaction.commit();

        res.json({ 
            success: true, 
            message: "Receptionist removed successfully" 
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting receptionist:', error);
        res.status(500).json({ error: "Failed to delete receptionist" });
    }
});

/**
 * POST /receptionists/:id/increment-bills - Increment the no_of_bills counter for a receptionist
 */
router.post("/:id/increment-bills", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the receptionist and ensure the employee is in the correct lab
        const emp = await employee.findOne({ where: { id, lab_id: req.tenant.lab_id, role: 'receptionist' } });
        if (!emp) {
            return res.status(404).json({ error: "Receptionist not found in this lab" });
        }

        const receptionistRecord = await receptionist.findOne({ where: { id } });
        if (!receptionistRecord) {
            return res.status(404).json({ error: "Receptionist record not found" });
        }

        // Increment the no_of_bills counter
        await receptionistRecord.increment('no_of_bills');

        // Fetch the updated record
        await receptionistRecord.reload();

        res.json({ 
            success: true, 
            message: "Bills counter incremented successfully",
            no_of_bills: receptionistRecord.no_of_bills 
        });
    } catch (error) {
        console.error('Error incrementing bills counter:', error);
        res.status(500).json({ error: "Failed to increment bills counter" });
    }
});

module.exports = router; 