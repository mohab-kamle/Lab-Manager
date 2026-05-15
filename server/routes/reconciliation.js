
const express = require("express");
const router = express.Router();
const { bill, reconciliation, reconciliation_item, payment_method, lab, financial_transaction, phone_number } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const db = require('../models');
const Op = db.Sequelize.Op;
const OTPManager = require('../utils/otpManager');
const cacheService = require('../services/cacheService');
const WhatsAppService = require('../services/whatsapp');

/**
 * POST /reconciliation/send-otp
 * Sends a 6-digit OTP to the patient's primary WhatsApp number.
 * Required before processing a credit-only settlement.
 */
router.post("/send-otp", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    try {
        const { patient_id } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: "patient_id is required." });
        }

        // 1. Fetch patient and their primary phone number
        const patientRecord = await db.patient.findByPk(patient_id, {
            include: [{
                model: phone_number,
                as: 'phones',
                where: { is_primary: true },
                required: false,
                limit: 1
            }]
        });

        if (!patientRecord) {
            return res.status(404).json({ error: "Patient not found." });
        }

        // Fallback: if no primary phone, try any phone for this patient
        let patientPhone = patientRecord.phones?.[0]?.phone;
        if (!patientPhone) {
            const anyPhone = await phone_number.findOne({
                where: { patient_id },
                order: [['is_primary', 'DESC']]
            });
            patientPhone = anyPhone?.phone;
        }

        if (!patientPhone) {
            return res.status(400).json({
                error: "Patient has no phone number registered. Cannot send OTP.",
                code: "NO_PHONE"
            });
        }

        // 2. Generate OTP and store in Redis with 5-minute TTL
        const otp = OTPManager.generateOTP();
        const otpHash = OTPManager.hashOTP(otp);
        const redisKey = cacheService.generateKey('settlement_otp', patient_id.toString());

        // Store OTP hash and attempt counter in cache (300 seconds = 5 minutes)
        const stored = await cacheService.set(redisKey, JSON.stringify({
            hash: otpHash,
            attempts: 0,
            created_at: Date.now()
        }), 300);

        if (!stored) {
            return res.status(500).json({ error: "Failed to generate OTP. Cache service may be unavailable." });
        }

        // 3. Send OTP via WhatsApp
        const labRecord = await lab.findByPk(req.tenant.lab_id, { attributes: ['name'] });
        const labName = labRecord?.name || 'Your Lab';

        const message = `🔒 *Settlement Verification*\n\nYour OTP code is: *${otp}*\n\nThis code is required to authorize a credit settlement at ${labName}.\nIt expires in 5 minutes.\n\nIf you did not request this, please contact the lab immediately.`;

        await WhatsAppService.sendText(req.tenant.lab_id, patientPhone, message);

        // Return masked phone number for UI display
        const maskedPhone = patientPhone.slice(0, 4) + '****' + patientPhone.slice(-2);

        return res.json({
            success: true,
            message: `OTP sent to ${maskedPhone}`,
            masked_phone: maskedPhone,
            expires_in: 300 // 5 minutes in seconds
        });

    } catch (error) {
        console.error("Error sending settlement OTP:", error);
        return res.status(500).json({
            error: error.message || "Failed to send OTP.",
            code: error.message?.includes('not connected') ? 'WHATSAPP_DISCONNECTED' : 'SEND_FAILED'
        });
    }
});

/**
 * POST /reconciliation
 * Process a Reconciliation Payment.
 * Supports cash, credit, or mixed payments.
 * Credit-only payments require OTP verification.
 */
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const {
            patient_id,
            amount,
            payment_method_id,
            notes,
            date,
            strategy,
            invoice_ids,
            // Credit-related fields
            use_credit = false,
            credit_amount = 0,
            // Credit cashout mode (returning credit to patient as cash)
            credit_cashout = false,
            // OTP for credit-only settlement and cashout
            otp
        } = req.body;

        // --- CREDIT CASHOUT FLOW ---
        // When patient has credit but no outstanding bills, they can withdraw credit as cash
        if (credit_cashout) {
            const cashoutAmt = parseFloat(credit_amount) || 0;

            if (cashoutAmt <= 0) {
                await transaction.rollback();
                return res.status(400).json({ error: "Cashout amount must be greater than zero." });
            }

            if (!otp) {
                await transaction.rollback();
                return res.status(400).json({ error: "OTP is required for credit cashout.", code: "OTP_REQUIRED" });
            }

            // Fetch patient
            const patientRecord = await db.patient.findByPk(patient_id, { transaction });
            if (!patientRecord) {
                await transaction.rollback();
                return res.status(404).json({ error: "Patient not found." });
            }

            const patientCredit = parseFloat(patientRecord.credit || 0);
            if (cashoutAmt > patientCredit) {
                await transaction.rollback();
                return res.status(400).json({
                    error: `Cashout amount (${cashoutAmt}) exceeds available credit (${patientCredit}).`
                });
            }

            // Verify OTP
            const redisKey = cacheService.generateKey('settlement_otp', patient_id.toString());
            const storedData = await cacheService.get(redisKey);

            if (!storedData) {
                await transaction.rollback();
                return res.status(400).json({ error: "OTP has expired or was never sent.", code: "OTP_EXPIRED" });
            }

            const otpData = JSON.parse(storedData);
            if (otpData.attempts >= 5) {
                await cacheService.del(redisKey);
                await transaction.rollback();
                return res.status(429).json({ error: "Too many failed OTP attempts.", code: "OTP_MAX_ATTEMPTS" });
            }

            if (!OTPManager.verifyOTP(otp, otpData.hash)) {
                otpData.attempts += 1;
                const remainingTTL = Math.max(1, 300 - Math.floor((Date.now() - otpData.created_at) / 1000));
                await cacheService.set(redisKey, JSON.stringify(otpData), remainingTTL);
                await transaction.rollback();
                return res.status(400).json({
                    error: `Invalid OTP. ${5 - otpData.attempts} attempts remaining.`,
                    code: "OTP_INVALID"
                });
            }

            // OTP valid — clear it
            await cacheService.del(redisKey);

            // Deduct credit from patient
            await patientRecord.update({
                credit: Math.round((patientCredit - cashoutAmt) * 100) / 100
            }, { transaction });

            // Record the cashout as a financial transaction
            await financial_transaction.create({
                lab_id: req.tenant.lab_id,
                patient_id,
                processed_by_id: req.user.id,
                processed_by_type: req.user.role,
                amount: cashoutAmt,
                payment_method_id,
                process_type: 'Credit Cashout',
                from: 'Lab',
                to: 'Patient',
                refund_items: [{ type: 'credit_cashout' }]
            }, { transaction });

            await transaction.commit();
            return res.status(201).json({
                message: "Credit cashout processed successfully",
                credit_cashed_out: cashoutAmt,
                remaining_credit: Math.round((patientCredit - cashoutAmt) * 100) / 100
            });
        }

        // --- NORMAL SETTLEMENT FLOW ---
        const cashAmount = parseFloat(amount) || 0;
        const creditUsed = use_credit ? (parseFloat(credit_amount) || 0) : 0;
        const totalPayment = Math.round((cashAmount + creditUsed) * 100) / 100;

        // 1. Basic Input Validation
        if (totalPayment <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "Total payment (cash + credit) must be greater than zero." });
        }

        // Cash-only settlements still require a payment method
        if (cashAmount > 0 && !payment_method_id) {
            await transaction.rollback();
            return res.status(400).json({ error: "Payment method is required for cash payments." });
        }

        // 2. Fetch Patient & Validate
        const patientRecord = await db.patient.findByPk(patient_id, { transaction });
        if (!patientRecord) {
            await transaction.rollback();
            return res.status(404).json({ error: "Patient not found." });
        }

        const patientDue = parseFloat(patientRecord.due || 0);
        const patientCredit = parseFloat(patientRecord.credit || 0);

        // Validate: cash portion cannot exceed total patient due
        if (cashAmount > patientDue) {
            await transaction.rollback();
            return res.status(400).json({
                error: `Cash payment (${cashAmount}) exceeds patient's total due balance (${patientDue}).`
            });
        }

        // Validate: credit portion cannot exceed available credit
        if (creditUsed > 0 && creditUsed > patientCredit) {
            await transaction.rollback();
            return res.status(400).json({
                error: `Credit amount (${creditUsed}) exceeds patient's available credit (${patientCredit}).`
            });
        }

        // Validate: total payment cannot exceed total due
        if (totalPayment > patientDue) {
            await transaction.rollback();
            return res.status(400).json({
                error: `Total payment (${totalPayment}) exceeds patient's total due balance (${patientDue}).`
            });
        }

        // 3. OTP Verification — required ONLY when entire payment is from credit (no cash)
        if (cashAmount === 0 && creditUsed > 0) {
            if (!otp) {
                await transaction.rollback();
                return res.status(400).json({
                    error: "OTP is required for credit-only settlements.",
                    code: "OTP_REQUIRED"
                });
            }

            const redisKey = cacheService.generateKey('settlement_otp', patient_id.toString());
            const storedData = await cacheService.get(redisKey);

            if (!storedData) {
                await transaction.rollback();
                return res.status(400).json({
                    error: "OTP has expired or was never sent. Please request a new one.",
                    code: "OTP_EXPIRED"
                });
            }

            const otpData = JSON.parse(storedData);

            // Check max attempts (5 tries)
            if (otpData.attempts >= 5) {
                await cacheService.del(redisKey);
                await transaction.rollback();
                return res.status(429).json({
                    error: "Too many failed OTP attempts. Please request a new code.",
                    code: "OTP_MAX_ATTEMPTS"
                });
            }

            // Verify OTP
            if (!OTPManager.verifyOTP(otp, otpData.hash)) {
                // Increment attempts
                otpData.attempts += 1;
                const remainingTTL = Math.max(1, 300 - Math.floor((Date.now() - otpData.created_at) / 1000));
                await cacheService.set(redisKey, JSON.stringify(otpData), remainingTTL);

                await transaction.rollback();
                return res.status(400).json({
                    error: `Invalid OTP. ${5 - otpData.attempts} attempts remaining.`,
                    code: "OTP_INVALID"
                });
            }

            // OTP verified — clear it from cache so it can't be reused
            await cacheService.del(redisKey);
        }

        // 4. Determine Target Bills based on Strategy
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
            if (totalPayment > selectedBillsDue) {
                await transaction.rollback();
                return res.status(400).json({
                    error: `Total payment (${totalPayment}) exceeds the total due (${selectedBillsDue.toFixed(2)}) for the selected invoices.`
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
            await transaction.rollback();
            return res.status(404).json({ error: 'Lab not found.' });
        }

        if (targetBills.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "No unpaid bills found to apply payment to." });
        }

        // 5. Create the Reconciliation Header Record
        const newReconciliation = await db.reconciliation.create({
            patient_id,
            lab_id: req.tenant.lab_id,
            amount: totalPayment, // Total settlement amount (cash + credit)
            payment_method_id: payment_method_id || null,
            notes: creditUsed > 0
                ? `${notes || ''} [Credit used: EGP ${creditUsed.toFixed(2)}]`.trim()
                : notes,
            date: date ? new Date(date) : new Date()
        }, { transaction });

        // 6. Unified Iterative Allocation (FIFO Logic over targetBills)
        let remainingPayment = totalPayment;

        for (const currentBill of targetBills) {
            if (remainingPayment <= 0) break;

            const billDue = parseFloat(currentBill.due);
            const amountToApply = Math.min(remainingPayment, billDue);

            // Update the bill's paid and due amounts
            const newPaid = parseFloat(currentBill.paid) + amountToApply;
            const newDue = billDue - amountToApply;

            await currentBill.update({
                paid: Math.round(newPaid * 100) / 100,
                due: Math.round(newDue * 100) / 100
            }, { transaction });

            // Create the junction record
            await db.reconciliation_item.create({
                reconciliation_id: newReconciliation.id,
                bill_id: currentBill.id,
                amount_applied: amountToApply
            }, { transaction });

            remainingPayment -= amountToApply;
        }

        // 7. Finalize patient totals
        const patientUpdate = {
            paid: Math.round((parseFloat(patientRecord.paid) + totalPayment) * 100) / 100,
            due: Math.round((patientDue - totalPayment) * 100) / 100
        };

        // If credit was used, deduct it from patient's credit balance
        if (creditUsed > 0) {
            patientUpdate.credit = Math.round((patientCredit - creditUsed) * 100) / 100;
        }

        await patientRecord.update(patientUpdate, { transaction });

        // 8. Create Financial Transaction Record(s)
        // Record cash payment transaction (if any)
        if (cashAmount > 0) {
            await financial_transaction.create({
                lab_id: req.tenant.lab_id,
                patient_id,
                processed_by_id: req.user.id,
                processed_by_type: req.user.role,
                amount: cashAmount,
                process_type: 'Due',
                payment_method_id,
                from: 'Patient',
                to: 'Lab',
                refund_items: targetBills.map(b => ({ type: 'reconciliation', id: b.id }))
            }, { transaction });
        }

        // Record credit usage transaction (if any) — separate ledger entry for auditability
        if (creditUsed > 0) {
            await financial_transaction.create({
                lab_id: req.tenant.lab_id,
                patient_id,
                processed_by_id: req.user.id,
                processed_by_type: req.user.role,
                amount: creditUsed,
                process_type: 'Credit',
                from: 'Patient Credit',
                to: 'Lab',
                refund_items: targetBills.map(b => ({ type: 'reconciliation_credit', id: b.id }))
            }, { transaction });
        }

        await transaction.commit();
        return res.status(201).json({
            message: "Settlement successful",
            reconciliation: newReconciliation,
            credit_used: creditUsed,
            cash_paid: cashAmount
        });

    } catch (error) {
        try { await transaction.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr); }
        console.error("Error processing settlement:", error);
        res.status(500).json({ error: "Failed to process settlement", message: error.message });
    }
});

module.exports = router;
