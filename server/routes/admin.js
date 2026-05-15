const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
require("dotenv").config();
const { Op } = require('sequelize');
const { patient, test, medical_report, bill, manager_key, financial_transaction, payment_method, packages_and_offers, employee, branch } = require("../models");

const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext, tenantIsolation, addLabFilter } = require('../middleware/tenantContext');

// Dashboard stats endpoint
// Dashboard stats endpoint (multi-tenant)
router.get(
  '/dashboard-stats',
  authenticateUser,
  authorizeRoles('admin'),
  tenantContext,
  tenantIsolation,
  async (req, res) => {
    try {
      const labId = req.labId;

      // Get patient count
      const patientCount = await patient.count({
        where: addLabFilter({}, labId)
      });

      // Get test count
      const testCount = await test.count({
        where: addLabFilter({}, labId)
      });

      // Get pending reports count
      const pendingReports = await medical_report.count({
        where: addLabFilter({ pending: true }, labId)
      });

      // Get total revenue
      const revenueResult = await bill.findAll({
        where: addLabFilter({}, labId),
        attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'totalRevenue']]
      });
      const revenue = revenueResult[0].get('totalRevenue') || 0;

      // Get monthly revenue (current month)
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const monthlyRevenueResult = await bill.findAll({
        where: addLabFilter({
          date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        }, labId),
        attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'monthlyRevenue']]
      });
      const monthlyRevenue = monthlyRevenueResult[0].get('monthlyRevenue') || 0;

      // Get outstanding payments (total due)
      const outstandingPaymentsResult = await bill.findAll({
        where: addLabFilter({}, labId),
        attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('due')), 'outstandingPayments']]
      });
      const outstandingPayments = outstandingPaymentsResult[0].get('outstandingPayments') || 0;

      // Get average invoice value
      const avgInvoiceResult = await bill.findAll({
        where: addLabFilter({}, labId),
        attributes: [[bill.sequelize.fn('AVG', bill.sequelize.col('total')), 'avgInvoiceValue']]
      });
      const avgInvoiceValue = avgInvoiceResult[0].get('avgInvoiceValue') || 0;

      // Get payment collection rate
      const totalBilledResult = await bill.findAll({
        where: addLabFilter({}, labId),
        attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'totalBilled']]
      });
      const totalBilled = totalBilledResult[0].get('totalBilled') || 0;

      const totalPaidResult = await bill.findAll({
        where: addLabFilter({}, labId),
        attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('paid')), 'totalPaid']]
      });
      const totalPaid = totalPaidResult[0].get('totalPaid') || 0;

      const paymentCollectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100) : 0;

      // Get recent reports (last 5) - order by createdAt descending
      const recentReports = await medical_report.findAll({
        where: addLabFilter({}, labId),
        include: [
          {
            model: patient,
            as: 'patient',
            attributes: ['id', 'name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      // Get recent patients (last 5) - order by createdAt descending
      const recentPatients = await patient.findAll({
        where: addLabFilter({}, labId),
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'birth_date']
      });

      res.json({
        patientCount,
        testCount,
        pendingReports,
        revenue,
        monthlyRevenue,
        outstandingPayments,
        avgInvoiceValue,
        paymentCollectionRate,
        recentReports,
        recentPatients
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ error: 'Failed to get dashboard stats', details: error.message });
    }
  }
);

// get all lab's transactions
router.get("/transactions", authenticateUser, authorizeRoles("admin"), tenantContext, tenantIsolation, async (req, res) => {
    try {
              
        // 1. Build Dynamic Filter Object
        let whereClause = {
            lab_id: req.labId // Always restrict data to the current lab context
        };

        // 2. Query the Database
        const transactions = await financial_transaction.findAll({
            where: whereClause,
            include: [
                { 
                    model: patient, 
                    as: 'patient',
                    attributes: ['id', 'name'] 
                },
                { 
                    model: employee, 
                    as: 'processed_by', // Double check this alias matches what antigravity put in init-models.js!
                    attributes: ['id', 'name', 'role'] 
                },
                { 
                    model: payment_method, 
                    as: 'payment_method',
                    attributes: ['name'] 
                },
                {
                    model: bill,
                    as: 'bill',
                    include: [
                        { 
                            model: test, 
                            as: "test_id_tests", 
                            attributes: ['name'], 
                            through: { attributes: [] } 
                        },
                        { 
                            model: packages_and_offers, 
                            as: "package_id_packages_and_offers", 
                            attributes: ['name'], 
                            through: { attributes: [] } 
                        }
                    ]
                }
            ],
            order: [['date', 'DESC']] // Newest transactions first
        });

        // 3. Map to a flat, UI-friendly JSON format for the frontend
        const formattedResponse = transactions.map(txn => {
            
            // Build a quick summary string (e.g., "CBC, Liver Profile")
            let summaryItems = [];
            if (txn.bill) {
                if (txn.bill.test_id_tests) {
                    summaryItems.push(...txn.bill.test_id_tests.map(t => t.name));
                }
                if (txn.bill.package_id_packages_and_offers) {
                    summaryItems.push(...txn.bill.package_id_packages_and_offers.map(p => p.name));
                }
            }
            
            const summaryString = summaryItems.length > 0 
                ? summaryItems.join(', ') 
                : 'Account Adjustment';

          return {
                transactionId: txn.transaction_code,
                date: txn.date,
                amount: parseFloat(txn.amount),
                processType: txn.process_type,
                paidWith: txn.payment_method ? txn.payment_method.name : null,
                
                // Return nested object for processedBy
                processedBy: txn.processed_by ? {
                    id: txn.processed_by.id,
                    name: txn.processed_by.name,
                    role: txn.processed_by.role
                } : null,
                
                // Return nested object for patient
                patient: txn.patient ? {
                    id: txn.patient.id,
                    name: txn.patient.name
                } : null,
                
                invoiceId: txn.bill_id,
                summary: summaryString
            };
        });

        return res.status(200).json(formattedResponse);

    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({ 
            error: "Failed to fetch transactions",
            message: error.message 
        });
    }
});


router.post('/keys', authenticateUser, authorizeRoles("admin"), tenantContext, tenantIsolation, async (req, res) => {
  try {
    // Assuming the frontend sends these in the payload
    const { key_name } = req.body; 

    // 1. Generate a 16-character random hex string and format it with dashes
    const rawString = crypto.randomBytes(8).toString('hex').toUpperCase();
    const plainTextKey = `${rawString.slice(0,4)}-${rawString.slice(4,8)}-${rawString.slice(8,12)}-${rawString.slice(12,16)}`;
    
    // 2. Extract the first four digits for identification on the frontend
    const firstFour = plainTextKey.split('-')[0];

    // 3. Hash the plain text key securely
    const saltRounds = 10;
    const keyHash = await bcrypt.hash(plainTextKey, saltRounds);

    // 4. Calculate Expiry Date (exactly 6 months from today)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    // 5. Save to the database
    const newKey = await manager_key.create({
      key_hash: keyHash,
      key_name: key_name || `Key_${firstFour}`, // Fallback name if frontend doesn't provide one
      first_four: firstFour,
      admin_id: req.user.id,
      lab_id: req.labId,
      expires_at: expiresAt,
      is_active: true
    });

    // 6. CRITICAL: Return the plain text key ONLY ONCE
    return res.status(201).json({
      success: true,
      message: "Store this key securely. It will not be shown again.",
      key_id: newKey.id,
      key_name: newKey.key_name,
      expires_at: newKey.expires_at,
      plain_text_key: plainTextKey // NEVER return this in a GET request later!
    });

    } catch (error) {
    console.error("Error generating key:", error);
    return res.status(500).json({ error: "Failed to generate manager key." });
  }
});

// GET /admin/keys - List all keys for the lab
router.get('/keys', authenticateUser, authorizeRoles("admin"), tenantContext, tenantIsolation, async (req, res) => {
    try {
        const keys = await manager_key.findAll({
            where: { lab_id: req.labId },
            attributes: ['id', 'key_name', 'first_four', 'expires_at', 'is_active', 'createdAt']
        });
        res.json(keys);
    } catch (error) {
        console.error("Error fetching keys:", error);
        res.status(500).json({ error: "Failed to fetch manager keys." });
    }
});

// DELETE /admin/keys/:id - Revoke a key (soft delete)
router.delete('/keys/:id', authenticateUser, authorizeRoles("admin"), tenantContext, tenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const key = await manager_key.findOne({
            where: { id, lab_id: req.labId }
        });
        
        if (!key) return res.status(404).json({ error: "Key not found." });
        
        // Soft delete logic: setting is_active to false
        await key.update({ is_active: false });
        res.json({ success: true, message: "Key revoked successfully." });
    } catch (error) {
        console.error("Error revoking key:", error);
        res.status(500).json({ error: "Failed to revoke manager key." });
    }
});

module.exports = router; 