
const express = require("express");
const router = express.Router();
const { bill, reconciliation, reconciliation_item, payment_method, lab } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const db = require('../models');
const Op = db.Sequelize.Op; // Add this exactly here!

// POST Process a Reconciliation Payment
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const { patient_id, amount, payment_method_id, notes, date, strategy, invoice_ids } = req.body;
        const paymentAmount = parseFloat(amount);

        // 1. Basic Input Validation
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: "Invalid payment amount" });
        }

        // 2. Fetch Patient & Validate Global Overpayment 
        const patientRecord = await db.patient.findByPk(patient_id, { transaction });
        if (!patientRecord) {
            await transaction.rollback();
            return res.status(404).json({ error: "Patient not found" });
        }

        if (paymentAmount > parseFloat(patientRecord.due)) {
            await transaction.rollback();
            return res.status(400).json({ 
                error: `Payment amount (${paymentAmount}) exceeds patient's total due balance (${patientRecord.due}).` 
            });
        }

        // 3. Determine Target Bills based on Strategy
        let targetBills = [];

        if (strategy === 'manual' && invoice_ids && invoice_ids.length > 0) {
            // MANUAL: Fetch ONLY the selected bills
            targetBills = await db.bill.findAll({
                where: {
                    id: { [Op.in]: invoice_ids },
                    patient_id: patient_id,
                    lab_id: req.tenant.lab_id,
                    due: { [Op.gt]: 0 }
                },
                order: [['date', 'ASC']],
                transaction
            });

            // Validate that payment doesn't exceed the sum of the *selected* bills
            const selectedBillsDue = targetBills.reduce((sum, b) => sum + parseFloat(b.due), 0);
            if (paymentAmount > selectedBillsDue) {
                await transaction.rollback();
                return res.status(400).json({
                    error: `Payment amount (${paymentAmount}) exceeds the total due (${selectedBillsDue}) for the explicitly selected invoices.`
                });
            }
        } else {
            // AUTOMATED (FIFO): Fetch ALL unpaid bills
            targetBills = await db.bill.findAll({
                where: {
                    patient_id: patient_id,
                    lab_id: req.tenant.lab_id,
                    due: { [Op.gt]: 0 }
                },
                order: [['date', 'ASC']],
                transaction
            });
        }

        const labRecord = await lab.findByPk(req.tenant.lab_id, {
        attributes: ['name']
        });

        if (!labRecord) {
        return res.status(404).json({ error: 'Lab not found' });
        }

        if (targetBills.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "No unpaid bills found to apply payment to." });
        }

        // 4. Create the Reconciliation Header Record (Now applies to BOTH strategies)
        const newReconciliation = await db.reconciliation.create({
            patient_id,
            lab_id: req.tenant.lab_id,
            amount: paymentAmount,
            payment_method_id,
            notes,
            date: date ? new Date(date) : new Date()
        }, { transaction });

        // 5. Unified Iterative Allocation (FIFO Logic over targetBills)
        let remainingPayment = paymentAmount;

        for (const currentBill of targetBills) {
            if (remainingPayment <= 0) break; // Stop if payment is exhausted

            const billDue = parseFloat(currentBill.due);
            const amountToApply = Math.min(remainingPayment, billDue);

            // Update the bill's paid and due amounts
            const newPaid = parseFloat(currentBill.paid) + amountToApply;
            const newDue = billDue - amountToApply;

            await currentBill.update({
                paid: newPaid,
                due: newDue
            }, { transaction });

            // Create the junction record
            await db.reconciliation_item.create({
                reconciliation_id: newReconciliation.id,
                bill_id: currentBill.id,
                amount_applied: amountToApply
            }, { transaction });

            remainingPayment -= amountToApply;
        }

        // 6. Finalize patient total 
        await patientRecord.update({
            paid: parseFloat(patientRecord.paid) + paymentAmount,
            due: parseFloat(patientRecord.due) - paymentAmount
        }, { transaction });

        await transaction.commit();
        return res.status(201).json({ message: "Settlement successful", reconciliation: newReconciliation });

    } catch (error) {
        await transaction.rollback();
        console.error("Error processing settlement:", error);
        res.status(500).json({ error: "Failed to process settlement", message: error.message });
    }
});

module.exports = router;
