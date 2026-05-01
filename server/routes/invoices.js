const express = require("express");
const router = express.Router();
const { bill, bill_has_test, bill_has_payment_method, bill_has_package, test, payment_method, receptionist, patient, packages_and_offers, admin, medical_report, medical_report_has_test, pao_has_test, branch, status, sequelize, doctor, lab_settings,financial_transaction, employee} = require("../models");
console.log("AVAILABLE MODELS IN DB:", Object.keys(require('../models')));
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const { cacheInvoicesList, invalidateInvoicesList } = require("../middleware/cacheMiddleware");
require("dotenv").config();

/**
 * GET /invoices - Fetch all bills with associated tests, cultures, packages, and payment methods.
 */
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), tenantContext, cacheInvoicesList, async (req, res) => {
    try {
        console.log('Fetching invoices using optimized query...');

        const bills = await bill.findAll({
            where: {
                lab_id: req.tenant.lab_id
            },
            attributes: [
                'id', 'date', 'paid', 'due', 'subtotal', 'total', 'discount', 'tax',
                'status_id', 'branch_id', 'patient_id'
            ],
            include: [
                {
                    model: patient,
                    as: "patient",
                    attributes: ['id', 'name', 'patientcode']
                },
                {
                    model: doctor,
                    as: "referred_doctor",
                    attributes: ['id', 'name']
                },
                {
                    model: status,
                    as: "status",
                    attributes: ['state']
                },
                {
                    model: branch,
                    as: "branch",
                    attributes: ['name']
                },
                // Use separate queries for hasMany relations to avoid Cartesian products
                {
                    model: bill_has_test,
                    as: "bill_has_tests",
                    separate: true,
                    include: [{
                        model: test,
                        as: "test",
                        attributes: ['id', 'name']
                    }]
                },
                {
                    model: bill_has_package,
                    as: "bill_has_packages",
                    separate: true,
                    include: [{
                        model: packages_and_offers,
                        as: "package",
                        attributes: ['id', 'name', 'type']
                    }]
                },
                {
                    model: bill_has_payment_method,
                    as: "bill_has_payment_methods",
                    separate: true,
                    include: [{
                        model: payment_method,
                        as: "payment_method",
                        attributes: ['id', 'name']
                    }]
                }
            ],
            order: [['id', 'DESC']]
        });

        console.log(`Found ${bills.length} invoices`);

        // Transform the results to match the expected frontend format
        const formattedBills = bills.map(b => {
            const billData = b.toJSON();

            return {
                id: billData.id,
                date: billData.date,
                paid: billData.paid,
                due: billData.due,
                subtotal: billData.subtotal,
                total: billData.total,
                discount: billData.discount,
                tax: billData.tax,
                discount_percent: billData.discount && billData.subtotal ? ((billData.discount / billData.subtotal) * 100) : 0,
                status_id: billData.status_id,
                status: billData.status?.state,
                patient_id: billData.patient_id,
                patient_name: billData.patient?.name,
                patientcode: billData.patient?.patientcode,
                referred_doctor_id: billData.referred_doctor_id,
                referred_doctor_name: billData.referred_doctor?.name,
                branch_id: billData.branch_id,
                branch_name: billData.branch?.name,

                // Map separate includes
                tests: (billData.bill_has_tests || []).map(bht => ({
                    id: bht.test?.id,
                    name: bht.test?.name,
                    price: bht.price
                })),

                packages: (billData.bill_has_packages || []).map(bhp => ({
                    id: bhp.package?.id,
                    name: bhp.package?.name,
                    price: bhp.price,
                    type: bhp.package?.type
                })),

                payments: (billData.bill_has_payment_methods || []).map(bhpm => ({
                    payment_method_id: bhpm.payment_method?.id,
                    payment_method_name: bhpm.payment_method?.name,
                    paid_amount: bhpm.paid_amount
                })),

            };
        });

        console.log(`Successfully processed ${formattedBills.length} invoices`);
        res.json(formattedBills);
    } catch (error) {
        console.error('Error in GET /invoices:', error);
        // Return empty array on error to prevent frontend crashes
        res.json([]);
    }
});

/**
 * POST /invoices - Create a new bill with related tests, payment methods, and packages.
 */
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), invalidateInvoicesList, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = req;
        const {
            patient_id,
            tests = [],
            packages = [],
            payments = [],
            subtotal = 0,
            discount = 0,
            tax = 0,
            total = 0,
            paid = 0,
            due = 0,
            status_id,
            receptionist_id,
            branch_id, // <-- add branch_id here
            referred_doctor_id,
            date
        } = req.body;

        // Validate required fields
        if (!patient_id || !status_id || !receptionist_id) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Missing required fields: patient_id, status_id, and receptionist_id are required.' });
        }

        // Validate patient exists
        const patientExists = await patient.findByPk(patient_id);
        if (!patientExists) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Invalid patient_id' });
        }

        // Validate receptionist exists
        const receptionistExists = await employee.findOne({ 
            where: { 
                id: receptionist_id, 
                lab_id: patientExists.lab_id,
                role: 'receptionist' // optional: if you want to enforce the role
            } 
        });
        if (!receptionistExists) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Invalid receptionist_id' });
        }

        // Debug log for branch_id
        console.log('[INVOICE DEBUG] Incoming branch_id:', branch_id, 'Type:', typeof branch_id);
        // Create the bill
        const newBill = await bill.create({
            date: date ? new Date(date) : new Date(),
            paid,
            due,
            subtotal,
            discount,
            tax,
            total,
            receptionist_id,
            patient_id,
            status_id,
            lab_id: req.user.lab_id || patientExists.lab_id,
            branch_id: (branch_id !== undefined && branch_id !== '') ? branch_id : null, // <-- robust handling of branch_id
            referred_doctor_id: (referred_doctor_id !== undefined && referred_doctor_id !== '') ? referred_doctor_id : null
        }, { transaction });

        // Update patient's financial information
        const currentPatient = await patient.findByPk(patient_id, { transaction });
        if (currentPatient) {
            const currentTotal = parseFloat(currentPatient.total || 0);
            const currentPaid = parseFloat(currentPatient.paid || 0);
            const currentDue = parseFloat(currentPatient.due || 0);

            // Calculate new values
            const newTotal = currentTotal + parseFloat(total);
            const newPaid = currentPaid + parseFloat(paid);
            const newDue = currentDue + parseFloat(due);

            // Check for patient due limit
            // First fetch the lab settings
            const limitSetting = await lab_settings.findOne({
                where: {
                    lab_id: req.user.lab_id || patientExists.lab_id,
                    setting_key: 'patient_due_limit'
                },
                transaction
            });

            if (limitSetting && limitSetting.setting_value) {
                const limit = parseFloat(limitSetting.setting_value);
                // Check if the NEW due amount exceeds the limit AND valid limit (> 0)
                // Only block if the new due amount is GREATER than the limit
                // AND the specific invoice is adding MORE debt (due > 0)
                if (limit > 0 && newDue > limit && due > 0) {
                    // Check for bypass flag
                    if (!req.body.bypass_due_limit) {
                        await transaction.rollback();
                        return res.status(403).json({
                            error: 'Patient due limit exceeded',
                            requires_bypass: true,
                            current_due: currentDue,
                            new_due: newDue,
                            limit: limit,
                            invoice_due: due
                        });
                    }
                    console.log(`[INVOICE] Bypassing due limit for patient ${patient_id}. New Due: ${newDue}, Limit: ${limit}`);
                }
            }

            // Add new invoice amounts to patient totals
            await currentPatient.update({
                total: newTotal,
                paid: newPaid,
                due: newDue
            }, { transaction });

            console.log(`Updated patient ${patient_id} financials:`, {
                old: { total: currentTotal, paid: currentPaid, due: currentDue },
                new: { total: newTotal, paid: newPaid, due: newDue },
                invoice: { total, paid, due }
            });
        }

        // Update referring doctor's financial information
        if (referred_doctor_id) {
            const referredDoctor = await doctor.findByPk(referred_doctor_id, { transaction });
            if (referredDoctor) {
                const commissionPercent = parseFloat(referredDoctor.commission || 0);
                const commissionValue = parseFloat(total) * (commissionPercent / 100);

                const currentDocTotalGain = parseFloat(referredDoctor.total_gain || 0);
                const currentDocDue = parseFloat(referredDoctor.due || 0);
                const currentDocPatientCount = parseInt(referredDoctor.patient_count || 0, 10);

                await referredDoctor.update({
                    total_gain: currentDocTotalGain + commissionValue,
                    due: currentDocDue + commissionValue, // Assuming commission adds to doctor's due amount
                    patient_count: currentDocPatientCount + 1
                }, { transaction });

                console.log(`Updated doctor ${referred_doctor_id} financials: gained ${commissionValue} from invoice subtotal ${subtotal}`);
            }
        }

        // Add tests with their current prices
        for (const testId of tests) {
            const testRecord = await test.findByPk(parseInt(testId), { transaction });
            let price = 0.00;
            if (testRecord && testRecord.price !== null && testRecord.price !== undefined) {
                const parsedPrice = parseFloat(testRecord.price);
                price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
            }
            await bill_has_test.create({
                bill_id: newBill.id,
                test_id: parseInt(testId),
                price: price
            }, { transaction });
        }

        // Add packages with their current prices
        for (const packageId of packages) {
            const packageItem = await packages_and_offers.findByPk(parseInt(packageId), { transaction });
            let price = 0.00;
            if (packageItem && packageItem.price !== null && packageItem.price !== undefined) {
                const parsedPrice = parseFloat(packageItem.price);
                price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
            }
            await bill_has_package.create({
                bill_id: newBill.id,
                package_id: parseInt(packageId),
                price: price
            }, { transaction });
        }

        for (const payment of payments) {
            const paidAmount = parseFloat(payment.paid_amount);
            
            // Add payments
            await bill_has_payment_method.create({
                bill_id: newBill.id,
                payment_method_id: parseInt(payment.payment_method_id),
                paid_amount: paidAmount
            }, { transaction });

            // Log 'Payment' into the new financial ledger
            if (paidAmount > 0) {
                await financial_transaction.create({
                    amount: paidAmount,
                    process_type: 'Payment',
                    processed_by_id: user.id || receptionist_id, 
                    patient_id: patient_id,
                    bill_id: newBill.id,
                    payment_method_id: parseInt(payment.payment_method_id),
                    lab_id: req.user.lab_id || patientExists.lab_id,
                    branch_id: (branch_id !== undefined && branch_id !== '') ? branch_id : null, // <-- robust handling of branch_id
                }, { transaction });
            }
        }

        // Log 'Due' into the new financial ledger if there's debt
        const invoiceDue = parseFloat(due);
        if (invoiceDue > 0) {
            await financial_transaction.create({
                amount: invoiceDue,
                process_type: 'Due',
                processed_by_id: user.id || receptionist_id,
                patient_id: patient_id,
                bill_id: newBill.id,
                payment_method_id: null, // Debt doesn't use a payment method
                lab_id: req.user.lab_id || patientExists.lab_id,
                branch_id: (branch_id !== undefined && branch_id !== '') ? branch_id : null, // <-- robust handling of branch_id
            }, { transaction });
        }

        // Create medical report if invoice contains tests
        let allTests = [...tests];

        // Get tests from packages
        for (const packageId of packages) {
            const packageTests = await pao_has_test.findAll({
                where: { packages_and_offers_id: parseInt(packageId) },
                attributes: ['test_id']
            });

            allTests.push(...packageTests.map(pt => pt.test_id.toString()));
        }

        // Remove duplicates
        allTests = [...new Set(allTests)];

        // Only create medical report if there are tests
        console.log('Creating medical report with:', { allTests });
        if (allTests.length > 0) {
            try {
                const newMedicalReport = await medical_report.create({
                    lab_id: req.user.lab_id || patientExists.lab_id,
                    branch_id: (branch_id !== undefined && branch_id !== '') ? branch_id : null,
                    patient_id: patient_id,
                    bill_id: newBill.id,
                    date: date ? new Date(date) : new Date(),
                    done: false,
                    pending: true,
                    registered_at: new Date()
                }, { transaction });

                // Add tests
                if (allTests.length > 0) {
                    const testRecords = allTests.map(testId => ({
                        medical_report_id: newMedicalReport.id,
                        test_id: parseInt(testId),
                        status: 'pending'
                    }));
                    await medical_report_has_test.bulkCreate(testRecords, { transaction });
                }
            } catch (medicalReportError) {
                console.error('Error creating medical report:', medicalReportError);
                // If there's an error creating the medical report, rollback the transaction
                await transaction.rollback();
                throw medicalReportError;
            }
        }

        // Commit the transaction first
        await transaction.commit();
        console.log('Transaction committed successfully');

        // Verify medical report was created
        const verifyMedicalReport = await medical_report.findOne({
            where: { bill_id: newBill.id }
        });
        console.log('Medical report after commit:', verifyMedicalReport ? {
            id: verifyMedicalReport.id,
            bill_id: verifyMedicalReport.bill_id
        } : 'Not found');

        try {
            // Fetch the complete bill with all associations
            const completeBill = await bill.findOne({
                where: { id: newBill.id },
                include: [
                    {
                        model: patient,
                        as: "patient",
                        attributes: ['id', 'name', 'patientcode']
                    },
                    {
                        model: doctor,
                        as: "referred_doctor",
                        attributes: ['id', 'name']
                    },
                    {
                        model: test,
                        as: "test_id_tests",
                        through: { attributes: ['price'] },
                        attributes: ['id', 'name']
                    },
                    {
                        model: packages_and_offers,
                        as: "package_id_packages_and_offers",
                        through: { attributes: ['price'] },
                        attributes: ['id', 'name', 'type']
                    },
                    {
                        model: payment_method,
                        as: "payment_method_id_payment_methods",
                        through: { attributes: ['paid_amount'] },
                        attributes: ['id', 'name']
                    }
                ]
            });

            // Format response to match frontend expectations
            const response = {
                id: completeBill.id,
                date: completeBill.date,
                patient_id: completeBill.patient_id,
                patient_name: completeBill.patient.name,
                patientcode: completeBill.patient.patientcode,
                referred_doctor_id: completeBill.referred_doctor_id,
                referred_doctor_name: completeBill.referred_doctor?.name,
                status_id: completeBill.status_id,
                subtotal: completeBill.subtotal,
                discount: completeBill.discount,
                tax: completeBill.tax,
                total: completeBill.total,
                paid: completeBill.paid,
                due: completeBill.due,
                tests: completeBill.test_id_tests.map(t => ({
                    id: t.id,
                    name: t.name,
                    price: t.bill_has_test.price
                })),
                packages: completeBill.package_id_packages_and_offers.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.bill_has_package.price,
                    type: p.type
                })),
                payments: completeBill.payment_method_id_payment_methods.map(p => ({
                    payment_method_id: p.id,
                    payment_method_name: p.name,
                    paid_amount: p.bill_has_payment_method.paid_amount
                }))
            };

            res.status(201).json(response);
        } catch (fetchError) {
            // If there's an error fetching the complete bill, still return success but with basic data
            console.error('Error fetching complete bill:', fetchError);
            res.status(201).json({
                id: newBill.id,
                message: 'Invoice created successfully but failed to fetch complete details'
            });
        }
    } catch (error) {
        // Only rollback if the transaction hasn't been committed yet
        if (!transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error in POST /invoices:', error);
        res.status(500).json({
            error: "Failed to create invoice",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * GET /invoices/:id - Get a specific invoice by ID.
 */
router.get("/:id", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
    const { id } = req.params;

    try {
        const invoice = await bill.findOne({
            where: { id },
            include: [
                {
                    model: patient,
                    as: "patient",
                    attributes: ['id', 'name', 'patientcode']
                },
                {
                    model: test,
                    as: "test_id_tests",
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'price']
                },
                {
                    model: packages_and_offers,
                    as: "package_id_packages_and_offers",
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'price', 'type']
                },
                {
                    model: payment_method,
                    as: "payment_method_id_payment_methods",
                    through: { attributes: ['paid_amount'] },
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        // Format response to match frontend expectations
        const response = {
            id: invoice.id,
            date: invoice.date,
            patient_id: invoice.patient_id,
            patient_name: invoice.patient.name,
            patientcode: invoice.patient.patientcode,
            status_id: invoice.status_id,
            subtotal: invoice.subtotal,
            discount: invoice.discount,
            tax: invoice.tax,
            total: invoice.total,
            paid: invoice.paid,
            due: invoice.due,
            tests: invoice.test_id_tests.map(t => ({
                id: t.id,
                name: t.name,
                price: t.price
            })),
            packages: invoice.package_id_packages_and_offers.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                type: p.type
            })),
            payments: invoice.payment_method_id_payment_methods.map(p => ({
                payment_method_id: p.id,
                payment_method_name: p.name,
                paid_amount: p.bill_has_payment_method.paid_amount
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({
            error: "Failed to fetch invoice",
            message: error.message
        });
    }
});

/**
 * PUT /bills/:id - Update an existing bill.
 */
router.put("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), invalidateInvoicesList, async (req, res) => {
    const { id } = req.params;
    const {
        date,
        paid = 0,
        due = 0,
        subtotal = 0,
        discount = 0,
        tax = 0,
        total = 0,
        status_id,
        referred_doctor_id,
        tests,
        packages,
        payments
    } = req.body;
const transaction = await sequelize.transaction();
    try {
        const existingBill = await bill.findByPk(id);
        if (!existingBill) return res.status(404).json({ error: "Bill not found" });

        // Get the old values before updating
        const oldTotal = parseFloat(existingBill.total || 0);
        const oldPaid = parseFloat(existingBill.paid || 0);
        const oldDue = parseFloat(existingBill.due || 0);
        const oldDocId = existingBill.referred_doctor_id;
        const patientId = existingBill.patient_id;

        await existingBill.update({
            date,
            paid,
            due,
            subtotal,
            discount,
            tax,
            total,
            status_id,
            referred_doctor_id: (referred_doctor_id !== undefined && referred_doctor_id !== '') ? referred_doctor_id : null
        });

        // Update patient's financial information
        const currentPatient = await patient.findByPk(patientId);
        if (currentPatient) {
            const currentTotal = parseFloat(currentPatient.total || 0);
            const currentPaid = parseFloat(currentPatient.paid || 0);
            const currentDue = parseFloat(currentPatient.due || 0);

            // Remove old invoice amounts and add new ones
            const newTotal = currentTotal - oldTotal + parseFloat(total);
            const newPaid = currentPaid - oldPaid + parseFloat(paid);
            const newDue = currentDue - oldDue + parseFloat(due);

            await currentPatient.update({
                total: newTotal,
                paid: newPaid,
                due: newDue
            });

            console.log(`Updated patient ${patientId} financials for invoice ${id}:`, {
                oldInvoice: { total: oldTotal, paid: oldPaid, due: oldDue },
                newInvoice: { total, paid, due },
                oldPatient: { total: currentTotal, paid: currentPaid, due: currentDue },
                newPatient: { total: newTotal, paid: newPaid, newDue: newDue }
            });
        }

        // Update referring doctor's financial information
        if (oldDocId && oldDocId !== referred_doctor_id) {
            const oldDoctor = await doctor.findByPk(oldDocId);
            if (oldDoctor) {
                const commissionPercent = parseFloat(oldDoctor.commission || 0);
                const popCommissionValue = oldTotal * (commissionPercent / 100);
                await oldDoctor.update({
                    total_gain: parseFloat(oldDoctor.total_gain || 0) - popCommissionValue,
                    due: Math.max(0, parseFloat(oldDoctor.due || 0) - popCommissionValue),
                    patient_count: Math.max(0, parseInt(oldDoctor.patient_count || 1, 10) - 1)
                });
            }
        }

        if (referred_doctor_id) {
            const newDoc = await doctor.findByPk(referred_doctor_id);
            if (newDoc) {
                const commissionPercent = parseFloat(newDoc.commission || 0);
                const oldCommissionValue = oldDocId === referred_doctor_id ? (oldTotal * (commissionPercent / 100)) : 0;
                const newCommissionValue = parseFloat(total) * (commissionPercent / 100);

                await newDoc.update({
                    total_gain: parseFloat(newDoc.total_gain || 0) - oldCommissionValue + newCommissionValue,
                    due: parseFloat(newDoc.due || 0) - oldCommissionValue + newCommissionValue,
                    patient_count: oldDocId === referred_doctor_id ? newDoc.patient_count : parseInt(newDoc.patient_count || 0, 10) + 1
                });
            }
        }

        if (tests) {
            await bill_has_test.destroy({ where: { bill_id: id } });
            const validTests = tests.filter(test_id => !isNaN(Number(test_id)) && test_id !== '' && test_id !== null);
            // Get current prices for each test
            const testRecords = [];
            for (const testId of validTests) {
                const testItem = await test.findByPk(parseInt(testId));
                let price = 0.00;
                if (testItem && testItem.price !== null && testItem.price !== undefined) {
                    const parsedPrice = parseFloat(testItem.price);
                    price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
                }
                testRecords.push({
                    bill_id: id,
                    test_id: parseInt(testId),
                    price: price
                });
            }
            await bill_has_test.bulkCreate(testRecords);
        }



        if (packages) {
            await bill_has_package.destroy({ where: { bill_id: id } });
            const validPackages = packages.filter(package_id => !isNaN(Number(package_id)) && package_id !== '' && package_id !== null);
            // Get current prices for each package
            const packageRecords = [];
            for (const packageId of validPackages) {
                const packageItem = await packages_and_offers.findByPk(parseInt(packageId));
                let price = 0.00;
                if (packageItem && packageItem.price !== null && packageItem.price !== undefined) {
                    const parsedPrice = parseFloat(packageItem.price);
                    price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
                }
                packageRecords.push({
                    bill_id: id,
                    package_id: parseInt(packageId),
                    price: price
                });
            }
            await bill_has_package.bulkCreate(packageRecords);
        }

        if (payments) {
            await bill_has_payment_method.destroy({ where: { bill_id: id } });
            await bill_has_payment_method.bulkCreate(payments.map(({ payment_method_id, paid_amount }) => ({
                bill_id: id,
                payment_method_id: parseInt(payment_method_id),
                paid_amount: parseFloat(paid_amount)
            })));
        }



        // Find the associated medical report
        const medicalReport = await medical_report.findOne({ where: { bill_id: id } });

        if (medicalReport) {
            // Update medical_report_has_test
            if (tests) {
                // Get existing medical report tests
                const existingMedicalReportTests = await medical_report_has_test.findAll({ where: { medical_report_id: medicalReport.id } });
                const existingTestIds = new Set(existingMedicalReportTests.map(t => t.test_id));

                // Identify tests to add
                const testsToAdd = tests.filter(test_id => !existingTestIds.has(parseInt(test_id)))
                    .map(test_id => ({
                        medical_report_id: medicalReport.id,
                        test_id: parseInt(test_id),
                        status: 'pending' // Default status
                    }));

                // Identify tests to remove
                const testsToRemoveIds = existingMedicalReportTests.filter(existingTest => !tests.includes(existingTest.test_id.toString()))
                    .map(t => t.id);

                // Perform deletions and additions
                if (testsToRemoveIds.length > 0) {
                    await medical_report_has_test.destroy({ where: { id: testsToRemoveIds } });
                }
                if (testsToAdd.length > 0) {
                    await medical_report_has_test.bulkCreate(testsToAdd);
                }
            }

        }

        // Fetch the updated bill with all associations
        const updatedBill = await bill.findOne({
            where: { id },
            include: [
                {
                    model: patient,
                    as: "patient",
                    attributes: ['id', 'name', 'patientcode']
                },
                {
                    model: test,
                    as: "test_id_tests",
                    through: { attributes: ['price'] },
                    attributes: ['id', 'name']
                },
                {
                    model: packages_and_offers,
                    as: "package_id_packages_and_offers",
                    through: { attributes: ['price'] },
                    attributes: ['id', 'name', 'type']
                },
                {
                    model: payment_method,
                    as: "payment_method_id_payment_methods",
                    through: { attributes: ['paid_amount'] },
                    attributes: ['id', 'name']
                },
            ]
        });

        // Format response to match frontend expectations
        const response = {
            id: updatedBill.id,
            date: updatedBill.date,
            patient_id: updatedBill.patient_id,
            patient_name: updatedBill.patient.name,
            patientcode: updatedBill.patient.patientcode,
            status_id: updatedBill.status_id,
            subtotal: updatedBill.subtotal,
            discount: updatedBill.discount,
            tax: updatedBill.tax,
            total: updatedBill.total,
            paid: updatedBill.paid,
            due: updatedBill.due,
            tests: updatedBill.test_id_tests.map(t => ({
                id: t.id,
                name: t.name,
                price: t.bill_has_test.price
            })),
            packages: updatedBill.package_id_packages_and_offers.map(p => ({
                id: p.id,
                name: p.name,
                price: p.bill_has_package.price,
                type: p.type
            })),
            payments: updatedBill.payment_method_id_payment_methods.map(p => ({
                payment_method_id: p.id,
                payment_method_name: p.name,
                paid_amount: p.bill_has_payment_method.paid_amount
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({
            error: "Failed to update bill",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * ✅ DELETE /bills/:id - Delete a bill and associated records.
 */
router.delete("/:id", authenticateUser, authorizeRoles("admin"), invalidateInvoicesList, async (req, res) => {
    const { id } = req.params;
    const transaction = await sequelize.transaction();

    try {
        const existingBill = await bill.findByPk(id);
        if (!existingBill) {
            await transaction.rollback();
            return res.status(404).json({ error: "Bill not found" });
        }

        // Get bill amounts before deletion for patient financial update
        const billTotal = parseFloat(existingBill.total || 0);
        const billPaid = parseFloat(existingBill.paid || 0);
        const billDue = parseFloat(existingBill.due || 0);
        const patientId = existingBill.patient_id;
        const refDocId = existingBill.referred_doctor_id;

        // Delete all associated records first
        await bill_has_test.destroy({ where: { bill_id: id }, transaction });

        await bill_has_package.destroy({ where: { bill_id: id }, transaction });
        await bill_has_payment_method.destroy({ where: { bill_id: id }, transaction });

        // Find and delete associated medical report and its entries
        const medicalReport = await medical_report.findOne({ where: { bill_id: id }, transaction });
        if (medicalReport) {
            await medical_report_has_test.destroy({ where: { medical_report_id: medicalReport.id }, transaction });

            await medicalReport.destroy({ transaction });
        }

        // Delete the bill
        await existingBill.destroy({ transaction });

        // Update patient's financial information by removing the deleted invoice amounts
        const currentPatient = await patient.findByPk(patientId, { transaction });
        if (currentPatient) {
            const currentTotal = parseFloat(currentPatient.total || 0);
            const currentPaid = parseFloat(currentPatient.paid || 0);
            const currentDue = parseFloat(currentPatient.due || 0);

            // Remove deleted invoice amounts from patient totals
            const newTotal = currentTotal - billTotal;
            const newPaid = currentPaid - billPaid;
            const newDue = currentDue - billDue;

            await currentPatient.update({
                total: newTotal,
                paid: newPaid,
                due: newDue
            }, { transaction });

            console.log(`Updated patient ${patientId} financials after deleting invoice ${id}:`, {
                deletedInvoice: { total: billTotal, paid: billPaid, due: billDue },
                oldPatient: { total: currentTotal, paid: currentPaid, due: currentDue },
                newPatient: { total: newTotal, paid: newPaid, due: newDue }
            });
        }

        // Remove gain from referred doctor
        if (refDocId) {
            const refDoc = await doctor.findByPk(refDocId, { transaction });
            if (refDoc) {
                const commissionPercent = parseFloat(refDoc.commission || 0);
                const popCommissionValue = billTotal * (commissionPercent / 100);
                await refDoc.update({
                    total_gain: parseFloat(refDoc.total_gain || 0) - popCommissionValue,
                    due: Math.max(0, parseFloat(refDoc.due || 0) - popCommissionValue),
                    patient_count: Math.max(0, parseInt(refDoc.patient_count || 1, 10) - 1)
                }, { transaction });
            }
        }

        // Commit the transaction
        await transaction.commit();

        res.json({
            success: true,
            message: "Bill deleted successfully",
            data: { id }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting bill:', error);
        res.status(500).json({
            success: false,
            error: "Failed to delete bill",
            message: error.message
        });
    }
});

module.exports = router;
