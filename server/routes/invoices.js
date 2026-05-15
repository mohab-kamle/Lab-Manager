const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { bill, bill_has_test, bill_has_payment_method, bill_has_package, test, payment_method, receptionist, patient, packages_and_offers, admin, medical_report, medical_report_has_test, pao_has_test, branch, status, sequelize, doctor, lab_settings, employee, phone_number, sample_type, financial_transaction, lab, manager_key, lab_samples, lab_sample_type_settings } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const { cacheInvoicesList, invalidateInvoicesList } = require("../middleware/cacheMiddleware");

const integrityService = require("../services/integrityService");
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
                'id', 'date', 'paid', 'due', 'subtotal', 'total', 'discount', 'tax', 'tax_rate',
                'status_id', 'branch_id', 'patient_id', 'receptionist_id', 'referred_doctor_id'
            ],
            include: [
                {
                    model: patient,
                    as: "patient",
                    attributes: ['id', 'name', 'patientcode'],
                    include: [
                        {
                            model: phone_number,
                            as: 'phones',
                            attributes: [['phone', 'phone_number'], 'is_primary']
                        }
                    ]
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

        console.log(\`Found \${bills.length} invoices\`);

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
                tax_rate: billData.tax_rate,
                discount_percent: billData.discount && billData.subtotal ? ((billData.discount / billData.subtotal) * 100) : 0,
                status_id: billData.status_id,
                status: billData.status?.state,
                patient_id: billData.patient_id,
                patient_name: billData.patient?.name,
                patientcode: billData.patient?.patientcode,
                patient_phones: billData.patient?.phones?.map(p => p.phone_number),
                referred_doctor_id: billData.referred_doctor_id,
                referred_doctor_name: billData.referred_doctor?.name,
                branch_id: billData.branch_id,
                branch_name: billData.branch?.name,
                receptionist_id: billData.receptionist_id,

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

        console.log(\`Successfully processed \${formattedBills.length} invoices\`);
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
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, invalidateInvoicesList, async (req, res) => {
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
            tax_rate = 0,
            total = 0,
            paid = 0,
            due = 0,
            original_paid,
            change_amount,
            give_change,
            status_id,
            receptionist_id,
            branch_id,
            referred_doctor_id,
            date
        } = req.body;

        let finalTax = parseFloat(tax || 0);
        let finalTaxRate = parseFloat(tax_rate || 0);
        const finalSubtotal = parseFloat(subtotal || 0);

        if (finalTaxRate > 0 && finalTax === 0) {
            finalTax = finalSubtotal * finalTaxRate;
        } else if (finalTax > 0 && finalTaxRate === 0 && finalSubtotal > 0) {
            finalTaxRate = finalTax / finalSubtotal;
        }

        // Round finalTax to 2 decimal places and finalTaxRate to 4 decimal places
        finalTax = Math.round(finalTax * 100) / 100;
        finalTaxRate = Math.round(finalTaxRate * 10000) / 10000;

        // Re-calculate total to ensure consistency
        const finalTotal = finalSubtotal + finalTax - parseFloat(discount || 0);

        // Validate required fields
        if (!patient_id || !status_id || !receptionist_id) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Missing required fields: patient_id, status_id, and receptionist_id are required.' });
        }

        const lab_id = req.tenant.lab_id;

        // Validate patient exists
        const patientExists = await patient.findOne({ where: { id: patient_id, lab_id }, transaction });
        if (!patientExists) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Invalid patient_id or patient does not belong to your lab.' });
        }

        // Validate receptionist exists
        const receptionistExists = await employee.findOne({ 
            where: { 
                id: receptionist_id, 
                lab_id: patientExists.lab_id,
                role: 'receptionist' // optional: if you want to enforce the role
            },
            transaction
        });

        // Ensure admin can act as receptionist if they assign it to themselves
        if (user && user.role === 'admin' && Number(receptionist_id) === Number(user.id)) {
            await receptionist.findOrCreate({
                where: { id: user.id },
                defaults: { id: user.id, no_of_bills: 0 },
                transaction
            });
        }

        // Debug log for branch_id
        console.log('[INVOICE DEBUG] Incoming branch_id:', branch_id, 'Type:', typeof branch_id);
        // Create the bill
        // 0. Deduplicate input tests and packages
        const uniqueTestIds = tests ? [...new Set(tests.map(tid => parseInt(tid)))] : [];
        const uniquePackageIds = packages ? [...new Set(packages.map(pid => parseInt(pid)))] : [];

        const newBill = await bill.create({
            date: date ? new Date(date) : new Date(),
            paid,
            due,
            subtotal,
            discount,
            tax: finalTax,
            tax_rate: finalTaxRate,
            total: finalTotal,
            receptionist_id,
            patient_id,
            status_id,
            lab_id: lab_id,
            branch_id: (branch_id !== undefined && branch_id !== '') ? branch_id : null,
            referred_doctor_id: (referred_doctor_id !== undefined && referred_doctor_id !== '') ? referred_doctor_id : null,
            change_amount: (give_change && change_amount) ? change_amount : 0
        }, { transaction });

        // Update patient's financial information
        const currentPatient = await patient.findByPk(patient_id, { transaction });
        if (currentPatient) {
            const currentTotal = parseFloat(currentPatient.total || 0);
            const currentPaid = parseFloat(currentPatient.paid || 0);
            const currentDue = parseFloat(currentPatient.due || 0);

            // Calculate new values
            const newTotal = currentTotal + parseFloat(finalTotal);
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
                    console.log(\`[INVOICE] Bypassing due limit for patient \${patient_id}. New Due: \${newDue}, Limit: \${limit}\`);
                }
            }

            // Add new invoice amounts to patient totals
            await currentPatient.update({
                total: newTotal,
                paid: newPaid,
                due: newDue
            }, { transaction });

            console.log(\`Updated patient \${patient_id} financials:\`, {
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

                console.log(\`Updated doctor \${referred_doctor_id} financials: gained \${commissionValue} from invoice subtotal \${subtotal}\`);
            }
        }

        // Add tests with their current prices and signatures
        for (const testId of tests) {
            const testRecord = await test.findByPk(parseInt(testId), { transaction });
            let price = 0.00;
            if (testRecord && testRecord.price !== null && testRecord.price !== undefined) {
                const parsedPrice = parseFloat(testRecord.price);
                price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
            }
            const signature = integrityService.signItem(newBill.id, testId, price);
            await bill_has_test.create({
                bill_id: newBill.id,
                test_id: parseInt(testId),
                price: price,
                signature: signature
            }, { transaction });
        }

        // Add packages with their current prices and signatures
        for (const packageId of packages) {
            const packageItem = await packages_and_offers.findByPk(parseInt(packageId), { transaction });
            let price = 0.00;
            if (packageItem && packageItem.price !== null && packageItem.price !== undefined) {
                const parsedPrice = parseFloat(packageItem.price);
                price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
            }
            const signature = integrityService.signItem(newBill.id, packageId, price);
            await bill_has_package.create({
                bill_id: newBill.id,
                package_id: parseInt(packageId),
                price: price,
                signature: signature
            }, { transaction });
        }

        const currentLab = await lab.findByPk(lab_id, { transaction });
        const labName = currentLab ? currentLab.name : 'Lab';

        for (const payment of payments) {
            const paidAmount = parseFloat(payment.paid_amount || payment.amount || 0);
            if (paidAmount <= 0) continue;
            
            // Add payments
            await bill_has_payment_method.create({
                bill_id: newBill.id,
                payment_method_id: parseInt(payment.payment_method_id),
                paid_amount: isNaN(paidAmount) ? 0 : paidAmount
            }, { transaction });
            
            // Create Financial Transactions
            await financial_transaction.create({
                lab_id: lab_id,
                branch_id: branch_id || null,
                bill_id: newBill.id,
                patient_id: patient_id,
                processed_by_id: user.id,
                processed_by_type: req.user.role === 'admin' ? 'admin' : 'receptionist',
                amount: paidAmount,
                process_type: 'Payment',
                payment_method_id: parseInt(payment.payment_method_id),
                from: patientExists.name,
                to: labName
            }, { transaction });
        }


        // --- Integrity Signing ---
        const allItemsForSigning = [];
        const createdTests = await bill_has_test.findAll({ where: { bill_id: newBill.id }, transaction });
        const createdPackages = await bill_has_package.findAll({ where: { bill_id: newBill.id }, transaction });
        
        createdTests.forEach(t => allItemsForSigning.push({ signature: t.signature }));
        createdPackages.forEach(p => allItemsForSigning.push({ signature: p.signature }));

        const billIntegrityHash = integrityService.signBill({
            id: newBill.id,
            total: newBill.total
        }, allItemsForSigning);

        await newBill.update({ integrity_hash: billIntegrityHash }, { transaction });



        // Create medical report if invoice contains tests
        let allTests = [...uniqueTestIds.map(id => id.toString())];

        // Get tests from packages
        for (const packageId of uniquePackageIds) {
            const packageTests = await pao_has_test.findAll({
                where: { packages_and_offers_id: packageId },
                attributes: ['test_id'],
                transaction
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

                // ── Auto-create tracked samples for each test ──────────────
                // Each test gets its own lab_samples record with a unique barcode-friendly ID.
                // The sample_type_id is inherited from the test definition.
                const now = new Date().toISOString();
                for (const testId of allTests) {
                    const parsedTestId = parseInt(testId);
                    // Fetch the test to get its sample_type_id, scoped to this lab
                    const testRecord = await test.findOne({
                        where: { id: parsedTestId, lab_id },
                        attributes: ['id', 'sample_type_id'],
                        transaction
                    });

                    // Skip sample creation for tests that don't belong to this lab
                    if (!testRecord) {
                        console.warn(\`[INVOICE] Skipping sample creation for test \${parsedTestId}: not found or lab mismatch.\`);
                        continue;
                    }

                    // Generate a standardized UUID-based sample ID
                    const sampleId = \`SMP-\${crypto.randomUUID()}\`;

                    await lab_samples.create({
                        sample_id: sampleId,
                        medical_report_id: newMedicalReport.id,
                        test_id: parsedTestId,
                        sample_type_id: testRecord?.sample_type_id || null,
                        status: 'Pending Collection',
                        status_history: {
                            pending_collection_at: now,
                            collected_at: null,
                            dispatched_at: null,
                            in_process_at: null,
                            completed_at: null,
                            rejected_at: null,
                        }
                    }, { transaction });
                }
                console.log(\`[INVOICE] Auto-created \${allTests.length} tracked sample(s) for report \${newMedicalReport.id}\`);
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
                tax_rate: completeBill.tax_rate,
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
                    attributes: ['id', 'name', 'patientcode'],
                    include: [
                        {
                            model: phone_number,
                            as: 'phones',
                            attributes: [['phone', 'phone_number'], 'is_primary']
                        }
                    ]
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
                    attributes: ['id', 'name', 'price', 'type']
                },
                {
                    model: payment_method,
                    as: "payment_method_id_payment_methods",
                    through: { attributes: ['paid_amount'] },
                    attributes: ['id', 'name']
                },
                {
                    model: receptionist,
                    as: "receptionist",
                    include: [
                        {
                            model: employee,
                            as: "id_employee",
                            attributes: ['name']
                        }
                    ]
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
            tax_rate: invoice.tax_rate,
            total: invoice.total,
            paid: invoice.paid,
            due: invoice.due,
            receptionist_id: invoice.receptionist_id,
            receptionist_name: invoice.receptionist?.id_employee?.name,
            referred_doctor_id: invoice.referred_doctor_id,
            branch_id: invoice.branch_id,
            patient_phones: invoice.patient?.phones?.map(p => p.phone_number),
            tests: invoice.test_id_tests.map(t => ({
                id: t.id,
                name: t.name,
                price: t.bill_has_test.price
            })),
            packages: invoice.package_id_packages_and_offers.map(p => ({
                id: p.id,
                name: p.name,
                price: p.bill_has_package.price,
                type: p.type
            })),
            payments: invoice.payment_method_id_payment_methods.map(p => ({
                payment_method_id: p.id,
                payment_method_name: p.name,
                paid_amount: p.bill_has_payment_method.paid_amount
            })),
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
 * GET /invoices/:id/samples-collection - Get grouped tests by sample type for chemist to draw them (Smart Draw).
 */
router.get("/:id/samples-collection", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), tenantContext, async (req, res) => {
    const { id } = req.params;
    const lab_id = req.tenant.lab_id;

    try {
        const invoice = await bill.findOne({
            where: { id, lab_id },
            include: [
                {
                    model: patient,
                    as: "patient",
                    attributes: ['id', 'name', 'patientcode', 'gender', 'dob']
                },
                {
                    model: test,
                    as: "test_id_tests",
                    attributes: ['id', 'name', 'sample_type_id'],
                    include: [{
                        model: sample_type,
                        as: 'sample_type',
                        include: [{
                            model: lab_sample_type_settings,
                            as: 'lab_settings',
                            where: { lab_id },
                            required: false
                        }]
                    }]
                }
            ]
        });

        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        // Group tests by sample type
        const groupedSamples = {};
        let seq = 1;

        invoice.test_id_tests.forEach(t => {
            let st = t.sample_type ? t.sample_type.get({ plain: true }) : null;
            
            // Apply per-lab overrides if they exist
            if (st && st.lab_settings && st.lab_settings.length > 0) {
                const overrides = st.lab_settings[0];
                if (overrides.tube_color) st.tube_color = overrides.tube_color;
                if (overrides.container_type) st.container_type = overrides.container_type;
            }

            st = st || {
                id: 'unknown',
                type: 'Unknown Specimen',
                tube_color: 'Grey/Unknown',
                container_type: 'Generic Container',
                standard_code: '000'
            };

            const stId = st.id;
            if (!groupedSamples[stId]) {
                // HL7 compliant barcode: [InvoiceID]-[PatientID]-[Seq]-[Standard_Code]
                // Improved uniqueness by including invoice.id
                // Capped at 18 characters (might need trimming if too long)
                const rawBarcode = \`\${invoice.id}-\${invoice.patient.id}-\${seq++}-\${st.standard_code || '000'}\`;
                const barcode = rawBarcode.length > 18 ? rawBarcode.substring(0, 18) : rawBarcode;

                groupedSamples[stId] = {
                    sample_type: st,
                    tests: [],
                    barcode: barcode
                };
            }
            groupedSamples[stId].tests.push({
                id: t.id,
                name: t.name
            });
        });

        res.json({
            invoice_id: invoice.id,
            patient: invoice.patient,
            samples: Object.values(groupedSamples)
        });
    } catch (error) {
        console.error('Error in samples-collection:', error);
        res.status(500).json({ error: "Failed to fetch collection data" });
    }
});

/**
 * PUT /bills/:id - Update an existing bill.
 */
router.put("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, invalidateInvoicesList, async (req, res) => {
    const { id } = req.params;
    const {
        date,
        paid = 0,
        due = 0,
        original_paid,
        change_amount,
        give_change,
        subtotal = 0,
        discount = 0,
        tax = 0,
        tax_rate = 0,
        total = 0,
        status_id,
        referred_doctor_id,
        tests,
        packages,
        payments
    } = req.body;

    let finalTax = parseFloat(tax || 0);
    let finalTaxRate = parseFloat(tax_rate || 0);
    const finalSubtotal = parseFloat(subtotal || 0);

    if (finalTaxRate > 0 && finalTax === 0) {
        finalTax = finalSubtotal * finalTaxRate;
    } else if (finalTax > 0 && finalTaxRate === 0 && finalSubtotal > 0) {
        finalTaxRate = finalTax / finalSubtotal;
    }

    // Round finalTax to 2 decimal places and finalTaxRate to 4 decimal places
    finalTax = Math.round(finalTax * 100) / 100;
    finalTaxRate = Math.round(finalTaxRate * 10000) / 10000;

    // Re-calculate total to ensure consistency
    const finalTotal = finalSubtotal + finalTax - parseFloat(discount || 0);
    const lab_id = req.tenant.lab_id;

    const transaction = await sequelize.transaction();
    try {
        const existingBill = await bill.findOne({ 
            where: { id, lab_id },
            include: [
                { model: bill_has_test, as: 'bill_has_tests' },
                { model: bill_has_package, as: 'bill_has_packages' },
                { model: bill_has_payment_method, as: 'bill_has_payment_methods' }
            ],
            transaction
        });
        if (!existingBill) return res.status(404).json({ error: "Bill not found or you don't have permission to edit it." });

        const oldPaymentsMap = {};
        existingBill.bill_has_payment_methods.forEach(pm => {
            oldPaymentsMap[pm.payment_method_id] = parseFloat(pm.paid_amount || 0);
        });

        // 1. Lock-in Rule: Check if any items are being removed
        const currentTestIds = existingBill.bill_has_tests.map(t => t.test_id);
        const currentPackageIds = existingBill.bill_has_packages.map(p => p.package_id);

        const uniqueInputTests = tests ? [...new Set(tests.map(tid => parseInt(tid)))] : [];
        const uniqueInputPackages = packages ? [...new Set(packages.map(pid => parseInt(pid)))] : [];

        if (tests) {
            const removedTests = currentTestIds.filter(tid => !uniqueInputTests.includes(tid));
            if (removedTests.length > 0) {
                return res.status(403).json({ error: "Cannot remove existing tests. Use the refund module instead." });
            }
        }

        if (packages) {
            const removedPackages = currentPackageIds.filter(pid => !uniqueInputPackages.includes(pid));
            if (removedPackages.length > 0) {
                return res.status(403).json({ error: "Cannot remove existing packages. Use the refund module instead." });
            }
        }

        // // 2. Manager Key Rule: 2-hour restriction for paid amount update
        // const invoiceAgeHours = (new Date() - new Date(existingBill.createdAt || existingBill.date)) / (1000 * 60 * 60);
        // if (paid !== undefined && parseFloat(paid) !== parseFloat(existingBill.paid) && invoiceAgeHours > 2) {
        //     const { manager_key } = req.body;
        //     if (!manager_key) {
        //         return res.status(403).json({ 
        //             error: "Manager's Key required to update paid amount after 2 hours.",
        //             requires_manager_key: true
        //         });
        //     }
        //     const matchedKey = await validateRefundKey(manager_key, lab_id);
        //     if (!matchedKey) {
        //         return res.status(403).json({ error: "Invalid Manager's Key." });
        //     }
        // }

        // Get the old values before updating
        const oldTotal = parseFloat(existingBill.total || 0);
        const oldPaid = parseFloat(existingBill.paid || 0);
        const oldDue = parseFloat(existingBill.due || 0);
        const oldDocId = existingBill.referred_doctor_id;
        const patientId = existingBill.patient_id;

        await existingBill.update({
            date: date || existingBill.date,
            paid: paid !== undefined ? paid : existingBill.paid,
            due: due !== undefined ? due : existingBill.due,
            subtotal: subtotal !== undefined ? subtotal : existingBill.subtotal,
            discount: discount !== undefined ? discount : existingBill.discount,
            tax: tax !== undefined ? tax : existingBill.tax,
            total: total !== undefined ? total : existingBill.total,
            status_id: status_id || existingBill.status_id,
            referred_doctor_id: (referred_doctor_id !== undefined && referred_doctor_id !== '') ? referred_doctor_id : existingBill.referred_doctor_id,
            change_amount: (give_change && change_amount) ? change_amount : existingBill.change_amount
        }, { transaction });

        // Update patient's financial information
        const currentPatient = await patient.findByPk(patientId, { transaction });
        if (currentPatient) {
            const currentTotal = parseFloat(currentPatient.total || 0);
            const currentPaid = parseFloat(currentPatient.paid || 0);
            const currentDue = parseFloat(currentPatient.due || 0);

            // Remove old invoice amounts and add new ones
            const newTotal = currentTotal - oldTotal + parseFloat(finalTotal);
            const newPaid = currentPaid - oldPaid + parseFloat(paid);
            const newDue = currentDue - oldDue + parseFloat(due);

            await currentPatient.update({
                total: newTotal,
                paid: newPaid,
                due: newDue
            }, { transaction });

            console.log(\`Updated patient \${patientId} financials for invoice \${id}:\`, {
                oldInvoice: { total: oldTotal, paid: oldPaid, due: oldDue },
                newInvoice: { total, paid, due },
                oldPatient: { total: currentTotal, paid: currentPaid, due: currentDue },
                newPatient: { total: newTotal, paid: newPaid, newDue: newDue }
            });
        }

        // Update referring doctor's financial information
        if (oldDocId && oldDocId !== referred_doctor_id) {
            const oldDoctor = await doctor.findByPk(oldDocId, { transaction });
            if (oldDoctor) {
                const commissionPercent = parseFloat(oldDoctor.commission || 0);
                const popCommissionValue = oldTotal * (commissionPercent / 100);
                await oldDoctor.update({
                    total_gain: parseFloat(oldDoctor.total_gain || 0) - popCommissionValue,
                    due: Math.max(0, parseFloat(oldDoctor.due || 0) - popCommissionValue),
                    patient_count: Math.max(0, parseInt(oldDoctor.patient_count || 1, 10) - 1)
                }, { transaction });
            }
        }

        if (referred_doctor_id) {
            const newDoc = await doctor.findByPk(referred_doctor_id, { transaction });
            if (newDoc) {
                const commissionPercent = parseFloat(newDoc.commission || 0);
                const oldCommissionValue = oldDocId === referred_doctor_id ? (oldTotal * (commissionPercent / 100)) : 0;
                const newCommissionValue = parseFloat(total) * (commissionPercent / 100);

                await newDoc.update({
                    total_gain: parseFloat(newDoc.total_gain || 0) - oldCommissionValue + newCommissionValue,
                    due: parseFloat(newDoc.due || 0) - oldCommissionValue + newCommissionValue,
                    patient_count: oldDocId === referred_doctor_id ? newDoc.patient_count : parseInt(newDoc.patient_count || 0, 10) + 1
                }, { transaction });
            }
        }

        if (tests) {
            // Fetch existing tests in report to avoid duplicates
            let existingReportTestIds = [];
            const medReport = await medical_report.findOne({ where: { bill_id: id }, transaction });
            if (medReport) {
                const rTests = await medical_report_has_test.findAll({ where: { medical_report_id: medReport.id }, transaction });
                existingReportTestIds = rTests.map(rt => rt.test_id);
            }

            const newTests = uniqueInputTests.filter(tid => 
                !currentTestIds.includes(tid) && 
                !existingReportTestIds.includes(tid)
            );

            for (const testId of newTests) {
                const testItem = await test.findByPk(testId, { transaction });
                let price = 0.00;
                if (testItem && testItem.price !== null && testItem.price !== undefined) {
                    const parsedPrice = parseFloat(testItem.price);
                    price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
                }
                const signature = integrityService.signItem(id, testId, price);
                await bill_has_test.create({
                    bill_id: id,
                    test_id: testId,
                    price: price,
                    signature: signature
                }, { transaction });
            }
        }

        if (packages) {
            const newPackages = uniqueInputPackages.filter(pid => !currentPackageIds.includes(pid));
            for (const packageId of newPackages) {
                const packageItem = await packages_and_offers.findByPk(packageId, { transaction });
                let price = 0.00;
                if (packageItem && packageItem.price !== null && packageItem.price !== undefined) {
                    const parsedPrice = parseFloat(packageItem.price);
                    price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
                }
                const signature = integrityService.signItem(id, packageId, price);
                await bill_has_package.create({
                    bill_id: id,
                    package_id: packageId,
                    price: price,
                    signature: signature
                }, { transaction });
            }
        }

        if (payments) {
            await bill_has_payment_method.destroy({ where: { bill_id: id }, transaction });
            await bill_has_payment_method.bulkCreate(payments.map(({ payment_method_id, paid_amount }) => ({
                bill_id: id,
                payment_method_id: parseInt(payment_method_id),
                paid_amount: parseFloat(paid_amount)
            })), { transaction });
        }

        // 4. Update Medical Report - ADD tests from standalone and packages
        const mReport = await medical_report.findOne({ where: { bill_id: id }, transaction });
        if (mReport) {
            let testsForReport = uniqueInputTests ? [...uniqueInputTests.map(tid => tid.toString())] : [];

            // Add tests from packages
            if (uniqueInputPackages && uniqueInputPackages.length > 0) {
                for (const pId of uniqueInputPackages) {
                    const pTests = await pao_has_test.findAll({
                        where: { packages_and_offers_id: pId },
                        attributes: ['test_id'],
                        transaction
                    });
                    testsForReport.push(...pTests.map(pt => pt.test_id.toString()));
                }
            }

            // Deduplicate
            const uniqueTestsForReport = [...new Set(testsForReport.map(tid => parseInt(tid)))];

            const existingMedicalReportTests = await medical_report_has_test.findAll({ 
                where: { medical_report_id: mReport.id },
                transaction 
            });
            const existingTestIdsInReport = new Set(existingMedicalReportTests.map(t => t.test_id));

            const testsToAdd = uniqueTestsForReport.filter(tid => !existingTestIdsInReport.has(tid))
                .map(tid => ({
                    medical_report_id: mReport.id,
                    test_id: tid,
                    status: 'pending'
                }));

            if (testsToAdd.length > 0) {
                await medical_report_has_test.bulkCreate(testsToAdd, { transaction });
            }
        }

        // 3. Recalculate Integrity Hash
        const allItems = [];
        const updatedTests = await bill_has_test.findAll({ where: { bill_id: id }, transaction });
        const updatedPackages = await bill_has_package.findAll({ where: { bill_id: id }, transaction });
        
        updatedTests.forEach(t => allItems.push({ signature: t.signature }));
        updatedPackages.forEach(p => allItems.push({ signature: p.signature }));

        const newIntegrityHash = integrityService.signBill({
            id: existingBill.id,
            total: existingBill.total
        }, allItems);

        await existingBill.update({ integrity_hash: newIntegrityHash }, { transaction });

        // --- Create Financial Transactions ---
        const currentLab = await lab.findByPk(lab_id, { transaction });
        const labName = currentLab ? currentLab.name : 'Lab';
        const currentPatientForTx = await patient.findByPk(patientId, { transaction });
        const patientName = currentPatientForTx ? currentPatientForTx.name : 'Patient';

        if (payments) {
            for (const payment of payments) {
                const pmId = parseInt(payment.payment_method_id);
                const paidAmount = parseFloat(payment.paid_amount || payment.amount || 0);
                const oldAmount = oldPaymentsMap[pmId] || 0;

                if (paidAmount > oldAmount) {
                    await financial_transaction.create({
                        lab_id: lab_id,
                        branch_id: existingBill.branch_id || null,
                        bill_id: id,
                        patient_id: patientId,
                        processed_by_id: req.user.id,
                        amount: paidAmount - oldAmount,
                        process_type: 'Payment',
                        payment_method_id: pmId,
                        from: patientName,
                        to: labName
                    }, { transaction });
                }
            }
        }

        await transaction.commit();

        // Fetch the updated bill with all associations
        const updatedBill = await bill.findOne({
            where: { id },
            include: [
                {
                    model: patient,
                    as: "patient",
                    attributes: ['id', 'name', 'patientcode'],
                    include: [
                        {
                            model: phone_number,
                            as: 'phones',
                            attributes: [['phone', 'phone_number'], 'is_primary']
                        }
                    ]
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
            tax_rate: updatedBill.tax_rate,
            total: updatedBill.total,
            paid: updatedBill.paid,
            due: updatedBill.due,
            receptionist_id: updatedBill.receptionist_id,
            referred_doctor_id: updatedBill.referred_doctor_id,
            branch_id: updatedBill.branch_id,
            patient_phones: updatedBill.patient?.phones?.map(p => p.phone_number),
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
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error updating bill:', error);
        res.status(500).json({
            error: "Failed to update bill",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * PATCH /invoices/:id/add-test - Add new tests to an existing invoice
 */
router.patch("/:id/add-test", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, invalidateInvoicesList, async (req, res) => {
    const { id } = req.params;
    const { tests = [] } = req.body;
    const lab_id = req.tenant.lab_id;

    const transaction = await sequelize.transaction();
    try {
        const existingBill = await bill.findOne({ 
            where: { id, lab_id },
            include: [{ model: bill_has_test, as: 'bill_has_tests' }],
            transaction 
        });
        if (!existingBill) {
            await transaction.rollback();
            return res.status(404).json({ error: "Invoice not found." });
        }

        // 1. Fetch existing tests in the medical report to avoid duplicates (e.g., tests from packages)
        let existingReportTestIds = [];
        const medicalReport = await medical_report.findOne({ where: { bill_id: id }, transaction });
        if (medicalReport) {
            const reportTests = await medical_report_has_test.findAll({
                where: { medical_report_id: medicalReport.id },
                transaction
            });
            existingReportTestIds = reportTests.map(t => t.test_id);
        }

        // 2. Deduplicate input and filter against both Bill and Medical Report
        const currentBillTestIds = existingBill.bill_has_tests.map(t => t.test_id);
        const uniqueInputTests = [...new Set(tests.map(tid => parseInt(tid)))];
        
        const newTests = uniqueInputTests.filter(tid => 
            !currentBillTestIds.includes(tid) && 
            !existingReportTestIds.includes(tid)
        );

        if (newTests.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "No new tests to add. Tests might already exist in the bill or be part of an existing package." });
        }

        let additionalSubtotal = 0;
        const testRecords = [];

        for (const testId of newTests) {
            const testItem = await test.findByPk(parseInt(testId), { transaction });
            if (!testItem) continue;

            const price = parseFloat(testItem.price || 0);
            additionalSubtotal += price;

            const signature = integrityService.signItem(id, testId, price);
            testRecords.push({
                bill_id: id,
                test_id: parseInt(testId),
                price: price,
                signature: signature
            });
        }

        // Add to bill_has_test
        await bill_has_test.bulkCreate(testRecords, { transaction });

        // Calculate new Bill totals (Subtotal and Total)
        const newSubtotal = parseFloat(existingBill.subtotal) + additionalSubtotal;
        const newTotal = parseFloat(existingBill.total) + additionalSubtotal;

        // Update Patient and Bill Financials
        const currentPatient = await patient.findByPk(existingBill.patient_id, { transaction });
        if (currentPatient) {
            const originalInvoiceDue = parseFloat(existingBill.due);
            const newInvoiceDue = originalInvoiceDue + additionalSubtotal;
            
            const newPatientDue = parseFloat(currentPatient.due || 0) + additionalSubtotal;
            const newPatientTotal = parseFloat(currentPatient.total || 0) + additionalSubtotal;

            // Update patient records
            await currentPatient.update({
                total: newPatientTotal,
                due: newPatientDue
            }, { transaction });

            // Update bill records (Subtotal, Total, and Due)
            await existingBill.update({
                subtotal: newSubtotal,
                total: newTotal,
                due: newInvoiceDue
            }, { transaction });

        }

        // 4. Update Medical Report
        let finalMedicalReport = medicalReport;
        if (!finalMedicalReport) {
            // Create if missing
            finalMedicalReport = await medical_report.create({
                lab_id: lab_id,
                patient_id: existingBill.patient_id,
                bill_id: id,
                date: existingBill.date,
                done: false,
                pending: true,
                registered_at: new Date()
            }, { transaction });
        }

        const medicalReportTests = newTests.map(testId => ({
            medical_report_id: finalMedicalReport.id,
            test_id: parseInt(testId),
            status: 'pending'
        }));
        await medical_report_has_test.bulkCreate(medicalReportTests, { transaction });

        // Recalculate Integrity Hash
        const allItems = [];
        const updatedTests = await bill_has_test.findAll({ where: { bill_id: id }, transaction });
        const updatedPackages = await bill_has_package.findAll({ where: { bill_id: id }, transaction });
        
        updatedTests.forEach(t => allItems.push({ signature: t.signature }));
        updatedPackages.forEach(p => allItems.push({ signature: p.signature }));

        const newIntegrityHash = integrityService.signBill({
            id: existingBill.id,
            total: existingBill.total
        }, allItems);

        await existingBill.update({ integrity_hash: newIntegrityHash }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: `${newTests.length} tests added successfully.`,
            added_count: newTests.length,
            new_total: newTotal
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error adding tests to invoice:', error);
        res.status(500).json({ error: "Failed to add tests", message: error.message });
    }
});

/**
 * ✅ DELETE /bills/:id - Delete a bill and associated records.
 */
router.delete("/:id", authenticateUser, authorizeRoles("admin"), tenantContext, invalidateInvoicesList, async (req, res) => {
    const { id } = req.params;
    const lab_id = req.tenant.lab_id;
    const transaction = await sequelize.transaction();

    try {
        const existingBill = await bill.findOne({ where: { id, lab_id } });
        if (!existingBill) {
            await transaction.rollback();
            return res.status(404).json({ error: "Bill not found or you don't have permission to delete it." });
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

            console.log(\`Updated patient \${patientId} financials after deleting invoice \${id}:\`, {
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

/**
 * POST /invoices/:id/refund
 * Process a full or partial refund for a specific invoice following strict financial rules.
 * 1. Uses ORIGINAL locked prices from junction tables.
 * 2. Requires Manager Key for invoices > 24h old.
 * 3. Validates price integrity using integrityService.
 * 4. PAYS OFF BILL DUE FIRST: Refund value reduces debt before becoming cash-back/credit.
 * 5. If lab pays less than remainder, adds it to digital credit.
 */
router.post("/:id/refund", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, invalidateInvoicesList, async (req, res) => {
    const { id } = req.params;
    const {
        items = { tests: [], packages: [] },
        amountLabPays = 0,
        authKey,
        payment_method_id
    } = req.body;
    const lab_id = req.tenant.lab_id;

    let matchedKey = null;
    const transaction = await sequelize.transaction();

    try {
        // ── 1. Fetch the invoice with its locked item rows ────────────────────────
        const existingBill = await bill.findOne({
            where: { id, lab_id },
            include: [
                { model: bill_has_test,    as: 'bill_has_tests' },
                { model: bill_has_package, as: 'bill_has_packages' }
            ],
            transaction
        });

        if (!existingBill) {
            await transaction.rollback();
            return res.status(404).json({ error: "Invoice not found." });
        }

        // ── 2. Age Check (Rule 2) ────────────────────────────────────────────────
        const invoiceAgeHours = (Date.now() - new Date(existingBill.createdAt || existingBill.date).getTime()) / (1000 * 60 * 60);

        if (invoiceAgeHours > 24) {
            if (!authKey) {
                await transaction.rollback();
                return res.status(403).json({
                    error: "Authorization key is required for refunds on invoices older than 24 hours.",
                    requires_auth_key: true
                });
            }

            const validatedKey = await validateRefundKey(authKey, lab_id);
            if (!validatedKey) {
                await transaction.rollback();
                return res.status(403).json({ error: "Invalid or expired authorization key." });
            }
            matchedKey = validatedKey;
        }

        // ── 3. Resolve and Verify Items (Rule 1 & 3) ─────────────────────────────
        const refundTestIds = (Array.isArray(items?.tests) ? items.tests : [])
            .map(t => parseInt(t?.id))
            .filter(id => !isNaN(id));

        const refundPackageIds = (Array.isArray(items?.packages) ? items.packages : [])
            .map(p => parseInt(p?.id))
            .filter(id => !isNaN(id));

        if (refundTestIds.length === 0 && refundPackageIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "No items specified for refund." });
        }

        let totalRefundValue = 0;
        const itemsToProcess = [];

        // Verify Tests
        for (const testId of refundTestIds) {
            const bht = existingBill.bill_has_tests.find(t => t.test_id === testId);
            if (!bht) {
                await transaction.rollback();
                return res.status(400).json({ error: `Test ID ${testId} is not on this invoice.` });
            }
            const originalPrice = parseFloat(bht.price);
            // Integrity Check
            if (!integrityService.verifyItem(id, testId, originalPrice, bht.signature)) {
                await transaction.rollback();
                return res.status(422).json({ error: `Integrity check failed for test ID ${testId}.` });
            }
            totalRefundValue += originalPrice;
            itemsToProcess.push({ id: testId, type: 'test', price: originalPrice });
        }

        // Verify Packages
        for (const packageId of refundPackageIds) {
            const bhp = existingBill.bill_has_packages.find(p => p.package_id === packageId);
            if (!bhp) {
                await transaction.rollback();
                return res.status(400).json({ error: `Package ID ${packageId} is not on this invoice.` });
            }
            const originalPrice = parseFloat(bhp.price);
            // Integrity Check
            if (!integrityService.verifyItem(id, packageId, originalPrice, bhp.signature)) {
                await transaction.rollback();
                return res.status(422).json({ error: `Integrity check failed for package ID ${packageId}.` });
            }
            totalRefundValue += originalPrice;
            itemsToProcess.push({ id: packageId, type: 'package', price: originalPrice });
        }

        totalRefundValue = Math.round(totalRefundValue * 100) / 100;

        // ── 4. Financial Calculations (Rule 4 & 5) ───────────────────────────────
        const oldBillTotal = parseFloat(existingBill.total || 0);
        const oldBillPaid = parseFloat(existingBill.paid || 0);
        const oldBillDue = parseFloat(existingBill.due || 0);

        // PAY OFF DUE FIRST
        const amountUsedToPayOffDue = Math.min(totalRefundValue, oldBillDue);
        const remainderRefund = Math.round((totalRefundValue - amountUsedToPayOffDue) * 100) / 100;

        // Calculate Lab Payment vs Credit
        const actualCashBack = Math.min(remainderRefund, Math.max(0, parseFloat(amountLabPays || 0)));
        const addedToCredit = Math.round((remainderRefund - actualCashBack) * 100) / 100;

        // New Bill Values
        const newBillTotal = Math.round((oldBillTotal - totalRefundValue) * 100) / 100;
        const newBillDue = Math.round((oldBillDue - amountUsedToPayOffDue) * 100) / 100;
        const newBillPaid = Math.round((newBillTotal - newBillDue) * 100) / 100;

        // ── 5. Database Updates ──────────────────────────────────────────────────
        // A. Remove Items from Junction Tables
        if (refundTestIds.length > 0) {
            await bill_has_test.destroy({ where: { bill_id: id, test_id: { [Op.in]: refundTestIds } }, transaction });
        }
        if (refundPackageIds.length > 0) {
            await bill_has_package.destroy({ where: { bill_id: id, package_id: { [Op.in]: refundPackageIds } }, transaction });
        }

        // B. Update Bill
        await existingBill.update({
            total: newBillTotal,
            paid: newBillPaid,
            due: newBillDue,
            // Recalculate subtotal (assuming simple sum for this example)
            subtotal: Math.round((parseFloat(existingBill.subtotal) - totalRefundValue) * 100) / 100
        }, { transaction });

        // C. Update Patient (Rule 5)
        const currentPatient = await patient.findByPk(existingBill.patient_id, { transaction });
        if (currentPatient) {
            await currentPatient.update({
                total: Math.max(0, Math.round((parseFloat(currentPatient.total || 0) - totalRefundValue) * 100) / 100),
                due: Math.max(0, Math.round((parseFloat(currentPatient.due || 0) - amountUsedToPayOffDue) * 100) / 100),
                paid: Math.max(0, Math.round((parseFloat(currentPatient.paid || 0) - (actualCashBack + addedToCredit)) * 100) / 100),
                credit: Math.round((parseFloat(currentPatient.credit || 0) + addedToCredit) * 100) / 100
            }, { transaction });
        }

        // D. Update Medical Report
        const medReport = await medical_report.findOne({ where: { bill_id: id }, transaction });
        if (medReport) {
            // Remove tests (and tests from packages)
            let testsToRemove = [...refundTestIds];
            for (const pkgId of refundPackageIds) {
                const pkgTests = await pao_has_test.findAll({ where: { packages_and_offers_id: pkgId }, transaction });
                testsToRemove.push(...pkgTests.map(pt => pt.test_id));
            }
            await medical_report_has_test.destroy({
                where: { medical_report_id: medReport.id, test_id: { [Op.in]: testsToRemove } },
                transaction
            });
        }

        // E. Record Transaction
        await financial_transaction.create({
            lab_id: lab_id,
            branch_id: existingBill.branch_id,
            bill_id: id,
            patient_id: existingBill.patient_id,
            processed_by_id: req.user.id,
            processed_by_type: req.user.role,
            amount: -Math.abs(actualCashBack), // The cash that actually left the lab
            process_type: 'Refund',
            payment_method_id: payment_method_id || null,
            refund_items: itemsToProcess,
            manager_key_id: matchedKey ? matchedKey.id : null
        }, { transaction });

        // F. Integrity Signing (Rule 3)
        const allRemainingItems = [];
        const remTests = await bill_has_test.findAll({ where: { bill_id: id }, transaction });
        const remPackages = await bill_has_package.findAll({ where: { bill_id: id }, transaction });
        remTests.forEach(t => allRemainingItems.push({ signature: t.signature }));
        remPackages.forEach(p => allRemainingItems.push({ signature: p.signature }));

        const newHash = integrityService.signBill({ id: existingBill.id, total: newBillTotal }, allRemainingItems);
        await existingBill.update({ integrity_hash: newHash }, { transaction });

        await transaction.commit();

        return res.json({
            success: true,
            total_refund_value: totalRefundValue,
            paid_off_due: amountUsedToPayOffDue,
            cash_back: actualCashBack,
            added_to_credit: addedToCredit,
            new_bill_total: newBillTotal
        });

    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("Refund Error:", error);
        return res.status(500).json({ error: error.message || "Failed to process refund." });
    }
});

module.exports = router;
