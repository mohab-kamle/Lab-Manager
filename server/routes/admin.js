const express = require('express');
const router = express.Router();
require("dotenv").config();
const { Op } = require('sequelize');
const { patient, test, medical_report, bill } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

// Dashboard stats endpoint
router.get('/dashboard-stats', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get patient count
    const patientCount = await patient.count();
    
    // Get test count
    const testCount = await test.count();
    
    // Get pending reports count
    const pendingReports = await medical_report.count({
      where: { pending: true }
    });
    
    // Get total revenue
    const revenueResult = await bill.findAll({
      attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'totalRevenue']]
    });
    const revenue = revenueResult[0].get('totalRevenue') || 0;
    
    // Get monthly revenue (current month)
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const monthlyRevenueResult = await bill.findAll({
      where: {
        date: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'monthlyRevenue']]
    });
    const monthlyRevenue = monthlyRevenueResult[0].get('monthlyRevenue') || 0;
    
    // Get outstanding payments (total due)
    const outstandingPaymentsResult = await bill.findAll({
      attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('due')), 'outstandingPayments']]
    });
    const outstandingPayments = outstandingPaymentsResult[0].get('outstandingPayments') || 0;
    
    // Get average invoice value
    const avgInvoiceResult = await bill.findAll({
      attributes: [[bill.sequelize.fn('AVG', bill.sequelize.col('total')), 'avgInvoiceValue']]
    });
    const avgInvoiceValue = avgInvoiceResult[0].get('avgInvoiceValue') || 0;
    
    // Get payment collection rate
    const totalBilledResult = await bill.findAll({
      attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('total')), 'totalBilled']]
    });
    const totalBilled = totalBilledResult[0].get('totalBilled') || 0;
    
    const totalPaidResult = await bill.findAll({
      attributes: [[bill.sequelize.fn('SUM', bill.sequelize.col('paid')), 'totalPaid']]
    });
    const totalPaid = totalPaidResult[0].get('totalPaid') || 0;
    
    const paymentCollectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100) : 0;
    
    // Get recent reports (last 5) - order by createdAt descending
    const recentReports = await medical_report.findAll({
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
});

module.exports = router; 