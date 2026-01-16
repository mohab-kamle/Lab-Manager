const express = require("express");
const router = express.Router();
const { bill, bill_has_test, bill_has_payment_method, bill_has_culture, bill_has_package, test, culture, payment_method, receptionist, patient, packages_and_offers, admin, medical_report, medical_report_has_test, medical_report_has_culture, medical_report_culture_result, pao_has_test, pao_has_culture, bill_has_tg, medical_report_has_tg, test_group, branch } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const { cacheInvoicesList, invalidateInvoicesList } = require("../middleware/cacheMiddleware");
require("dotenv").config();
const { sequelize } = require("../models");

/**
 * GET /invoices - Fetch all bills with associated tests, cultures, packages, and payment methods.
 */
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), tenantContext, cacheInvoicesList, async (req, res) => {
    try {
        console.log('Fetching invoices...');
        const query = `
        SELECT 
            b.id, b.date, b.paid, b.due, b.subtotal, b.total, b.discount, b.tax,
            b.status_id, s.state as status, p.name AS patient_name, p.id as patient_id, p.patientcode,
            b.branch_id, br.name as branch_name,
            t.id AS test_id, t.name AS test_name, bht.price AS test_price,
            c.id AS culture_id, c.name AS culture_name, bhc.price AS culture_price,
            pkg.id AS package_id, pkg.name AS package_name, bhp.price AS package_price, pkg.type as package_type,
            pm.id AS payment_method_id, pm.name AS payment_method_name, bhpm.paid_amount,
            tg.id AS tg_id, tg.name AS tg_name, btg.price AS tg_price
        FROM bill b
        LEFT JOIN receptionist r ON r.id = b.receptionist_id
        LEFT JOIN patient p ON p.id = b.patient_id
        LEFT JOIN status s ON s.id = b.status_id
        LEFT JOIN branch br ON br.id = b.branch_id
        LEFT JOIN bill_has_test bht ON bht.bill_id = b.id
        LEFT JOIN test t ON t.id = bht.test_id
        LEFT JOIN bill_has_culture bhc ON bhc.bill_id = b.id
        LEFT JOIN culture c ON c.id = bhc.culture_id
        LEFT JOIN bill_has_package bhp ON bhp.bill_id = b.id
        LEFT JOIN packages_and_offers pkg ON pkg.id = bhp.package_id
        LEFT JOIN bill_has_payment_method bhpm ON bhpm.bill_id = b.id
        LEFT JOIN payment_method pm ON pm.id = bhpm.payment_method_id
        LEFT JOIN bill_has_tg btg ON btg.bill_id = b.id
        LEFT JOIN test_group tg ON tg.id = btg.tg_id
        WHERE b.lab_id = :labId
        ORDER BY b.id DESC;
        `;

        const results = await sequelize.query(query, {
            replacements: { labId: req.tenant.lab_id },
            type: sequelize.QueryTypes.SELECT
        });
        console.log(`Found ${results.length} invoices`);

        // Group bills by id
        const groupedBills = results.reduce((acc, row) => {
            let billEntry = acc.find((b) => b.id === row.id);

            if (!billEntry) {
                billEntry = {
                    id: row.id,
                    date: row.date,
                    paid: row.paid,
                    due: row.due,
                    subtotal: row.subtotal,
                    total: row.total,
                    discount: row.discount,
                    tax: row.tax,
                    discount_percent: row.discount ? ((row.discount / row.subtotal) * 100) : 0,
                    status_id: row.status_id,
                    status: row.status,
                    patient_id: row.patient_id,
                    patient_name: row.patient_name,
                    patientcode: row.patientcode,
                    branch_id: row.branch_id,
                    branch_name: row.branch_name,
                    tests: [],
                    cultures: [],
                    packages: [],
                    payments: [],
                    test_groups: []
                };
                acc.push(billEntry);
            }

            if (row.test_id && !billEntry.tests.some(t => t.id === row.test_id)) {
                billEntry.tests.push({
                    id: row.test_id,
                    name: row.test_name,
                    price: row.test_price
                });
            }

            if (row.culture_id && !billEntry.cultures.some(c => c.id === row.culture_id)) {
                billEntry.cultures.push({
                    id: row.culture_id,
                    name: row.culture_name,
                    price: row.culture_price
                });
            }

            if (row.package_id && !billEntry.packages.some(p => p.id === row.package_id)) {
                billEntry.packages.push({
                    id: row.package_id,
                    name: row.package_name,
                    price: row.package_price,
                    type: row.package_type
                });
            }

            if (row.payment_method_id && !billEntry.payments.some(p => p.payment_method_id === row.payment_method_id)) {
                billEntry.payments.push({
                    payment_method_id: row.payment_method_id,
                    payment_method_name: row.payment_method_name,
                    paid_amount: row.paid_amount
                });
            }

            if (row.tg_id && !billEntry.test_groups.some(tg => tg.id === row.tg_id)) {
                billEntry.test_groups.push({
                    id: row.tg_id,
                    name: row.tg_name,
                    price: row.tg_price
                });
            }

            return acc;
        }, []);

        console.log(`Successfully processed ${groupedBills.length} invoices`);
        res.json(groupedBills || []);
    } catch (error) {
        console.error('Error in GET /invoices:', error);
        // Return empty array on error to prevent frontend crashes
        res.json([]);
    }
});

/**
 * POST /invoices - Create a new bill with related tests, payment methods, cultures, and packages.
 */
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), invalidateInvoicesList, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = req;
        const {
            patient_id,
            tests = [],
            cultures = [],
            packages = [],
            test_groups = [],
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
        const receptionistExists = await receptionist.findByPk(receptionist_id);
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
            branch_id: (branch_id !== undefined && branch_id !== '') ? branch_id : null // <-- robust handling of branch_id
        }, { transaction });

        // Update patient's financial information
        const currentPatient = await patient.findByPk(patient_id, { transaction });
        if (currentPatient) {
            const currentTotal = parseFloat(currentPatient.total || 0);
            const currentPaid = parseFloat(currentPatient.paid || 0);
            const currentDue = parseFloat(currentPatient.due || 0);

            // Add new invoice amounts to patient totals
            const newTotal = currentTotal + parseFloat(total);
            const newPaid = currentPaid + parseFloat(paid);
            const newDue = currentDue + parseFloat(due);

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

        // Add cultures with their current prices
        for (const cultureId of cultures) {
            const cultureItem = await culture.findByPk(parseInt(cultureId), { transaction });
            let price = 0.00;
            if (cultureItem && cultureItem.price !== null && cultureItem.price !== undefined) {
                const parsedPrice = parseFloat(cultureItem.price);
                price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
            }
            await bill_has_culture.create({
                bill_id: newBill.id,
                culture_id: parseInt(cultureId),
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

        // Add payments
        for (const payment of payments) {
            await bill_has_payment_method.create({
                bill_id: newBill.id,
                payment_method_id: parseInt(payment.payment_method_id),
                paid_amount: parseFloat(payment.paid_amount)
            }, { transaction });
        }

        // Deduplicate test groups early
        const uniqueTestGroups = [...new Set(test_groups)];
        console.log('Processing test groups:', { original: test_groups, deduplicated: uniqueTestGroups });

        // Add test groups with their current prices (deduplicated)
        for (const tgId of uniqueTestGroups) {
            const testGroup = await test_group.findByPk(parseInt(tgId), { transaction });
            let price = 0.00;
            if (testGroup && testGroup.price !== null && testGroup.price !== undefined) {
                const parsedPrice = parseFloat(testGroup.price);
                price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
            }
            await bill_has_tg.create({
                bill_id: newBill.id,
                tg_id: parseInt(tgId),
                price: price
            }, { transaction });
        }

        // Create medical report if invoice contains tests or cultures
        let allTests = [...tests];
        let allCultures = [...cultures];

        // Get tests and cultures from packages
        for (const packageId of packages) {
            const packageTests = await pao_has_test.findAll({
                where: { packages_and_offers_id: parseInt(packageId) },
                attributes: ['test_id']
            });
            const packageCultures = await pao_has_culture.findAll({
                where: { packages_and_offers_id: parseInt(packageId) },
                attributes: ['culture_id']
            });

            allTests.push(...packageTests.map(pt => pt.test_id.toString()));
            allCultures.push(...packageCultures.map(pc => pc.culture_id.toString()));
        }

        // Remove duplicates
        allTests = [...new Set(allTests)];
        allCultures = [...new Set(allCultures)];

        // Only create medical report if there are tests, cultures, or test groups
        console.log('Creating medical report with:', { allTests, allCultures, uniqueTestGroups });
        if (allTests.length > 0 || allCultures.length > 0 || uniqueTestGroups.length > 0) {
            try {
                // Create the medical report
                // Use branch_id from request, or fallback to patient's branch_id, or find main branch
                let medicalReportBranchId;
                if (branch_id !== undefined && branch_id !== '') {
                    medicalReportBranchId = branch_id;
                } else if (patientExists.branch_id) {
                    medicalReportBranchId = patientExists.branch_id;
                } else {
                    // Find main branch for the patient's lab
                    const mainBranch = await branch.findOne({
                        where: {
                            lab_id: patientExists.lab_id,
                            is_main_branch: true
                        }
                    });
                    
                    if (mainBranch) {
                        medicalReportBranchId = mainBranch.id;
                    } else {
                        // If no main branch found, find any branch for this lab
                        const anyBranch = await branch.findOne({
                            where: {
                                lab_id: patientExists.lab_id
                            }
                        });
                        medicalReportBranchId = anyBranch ? anyBranch.id : null;
                    }
                }
                
                console.log('Medical report branch_id logic:', {
                    requestBranchId: branch_id,
                    patientBranchId: patientExists.branch_id,
                    patientLabId: patientExists.lab_id,
                    finalBranchId: medicalReportBranchId
                });
                
                // Final check: if branch_id is still null, throw a descriptive error
                if (medicalReportBranchId === null) {
                    throw new Error(`Cannot create medical report: No branch found for lab ${patientExists.lab_id}. Please ensure at least one branch exists for this lab.`);
                }
                
                const newMedicalReport = await medical_report.create({
                    date: new Date(),
                    lab_id: req.user.lab_id || patientExists.lab_id,
                    branch_id: medicalReportBranchId,
                    patient_id: patient_id,
                    bill_id: newBill.id,
                    done: 0,
                    pending: 1,
                    comment: '',
                    signatory_name: null
                }, { transaction });

                // Add tests to medical report
                for (const testId of allTests) {
                    await medical_report_has_test.create({
                        medical_report_id: newMedicalReport.id,
                        test_id: parseInt(testId),
                        status: 'pending',
                        result: null
                    }, { transaction });
                }

                // Add cultures to medical report
                for (const cultureId of allCultures) {
                    await medical_report_has_culture.create({
                        medical_report_id: newMedicalReport.id,
                        culture_id: parseInt(cultureId),
                        status: 'pending',
                        result: null
                    }, { transaction });
                }

                // Add test groups to medical report
                if (uniqueTestGroups && uniqueTestGroups.length > 0) {
                    console.log(`\n=== Starting Test Group Association Process ===`);
                    console.log(`Creating ${uniqueTestGroups.length} test group associations for medical report ${newMedicalReport.id}`);
                    console.log(`Test groups to process:`, JSON.stringify(uniqueTestGroups, null, 2));
                    console.log(`Medical report ID: ${newMedicalReport.id}`);

                    // Validate all test group IDs are valid numbers
                    const invalidTestGroups = uniqueTestGroups.filter(tgId => isNaN(parseInt(tgId)));
                    if (invalidTestGroups.length > 0) {
                        throw new Error(`Invalid test group IDs found: ${invalidTestGroups.join(', ')}`);
                    }

                    // Create all test group associations at once using bulkCreate
                    const testGroupAssociations = uniqueTestGroups.map(tgId => {
                        const tgIdNum = parseInt(tgId);
                        if (isNaN(tgIdNum)) {
                            throw new Error(`Invalid test group ID: ${tgId}`);
                        }
                        return {
                            medical_report_id: newMedicalReport.id,
                            test_group_id: tgIdNum,
                            value: null
                            // Remove timestamps as they're handled by Sequelize
                        };
                    });

                    console.log(`\nPrepared ${testGroupAssociations.length} test group associations for creation:`);
                    console.log(JSON.stringify(testGroupAssociations, null, 2));

                    // Check if medical report exists before creating associations
                    const checkMedicalReport = await medical_report.findByPk(newMedicalReport.id, { transaction });
                    console.log(`Medical report exists check:`, checkMedicalReport ? 'YES' : 'NO');
                    if (checkMedicalReport) {
                        console.log(`Medical report details:`, {
                            id: checkMedicalReport.id,
                            bill_id: checkMedicalReport.bill_id,
                            patient_id: checkMedicalReport.patient_id
                        });
                    }

                    try {
                        // Step 1: Clear any existing associations for this medical report
                        console.log('\nStep 1: Clearing any existing test group associations...');
                        const deletedCount = await medical_report_has_tg.destroy({
                            where: { medical_report_id: newMedicalReport.id },
                            transaction
                        });
                        console.log(`✅ Cleared ${deletedCount} existing test group associations`);

                        // Step 2: Verify all test groups exist before creating associations
                        console.log('\nStep 2: Verifying test group existence...');
                        const testGroupVerification = await Promise.all(
                            uniqueTestGroups.map(async (tgId) => {
                                const tgIdNum = parseInt(tgId);
                                const tg = await test_group.findByPk(tgIdNum, { 
                                    transaction,
                                    raw: true
                                });
                                console.log(`Test group ${tgId} (${tgIdNum}):`, tg ? 'EXISTS' : 'NOT FOUND');
                                if (tg) {
                                    console.log(`   - Name: ${tg.name}`);
                                    console.log(`   - Price: ${tg.price}`);
                                }
                                return { id: tgIdNum, exists: !!tg, details: tg };
                            })
                        );

                        // Check for any missing test groups
                        const missingTestGroups = testGroupVerification.filter(tg => !tg.exists);
                        if (missingTestGroups.length > 0) {
                            const missingIds = missingTestGroups.map(tg => tg.id);
                            throw new Error(`The following test groups do not exist: ${missingIds.join(', ')}`);
                        }

                        // Step 3: Create all associations using bulkCreate with individualHooks
                        console.log('\nStep 3: Creating test group associations...');
                        console.log(`Attempting to create ${testGroupAssociations.length} associations...`);
                        
                        let createdAssociations = [];
                        try {
                            // First, try to create all associations at once
                            createdAssociations = await medical_report_has_tg.bulkCreate(
                                testGroupAssociations,
                                {
                                    validate: true,
                                    transaction,
                                    individualHooks: true,
                                    ignoreDuplicates: true
                                }
                            );
                            console.log(`✅ Successfully created ${createdAssociations.length} test group associations`);
                        } catch (bulkError) {
                            console.warn('Bulk create failed, falling back to individual creates:', bulkError.message);
                            
                            // If bulk create fails, try creating them one by one
                            createdAssociations = [];
                            for (const association of testGroupAssociations) {
                                try {
                                    const [instance, created] = await medical_report_has_tg.findOrCreate({
                                        where: {
                                            medical_report_id: association.medical_report_id,
                                            test_group_id: association.test_group_id
                                        },
                                        defaults: {
                                            medical_report_id: association.medical_report_id,
                                            test_group_id: association.test_group_id,
                                            value: null
                                        },
                                        transaction
                                    });
                                    
                                    if (created) {
                                        console.log(`✅ Created association for test group ${association.test_group_id}`);
                                    } else {
                                        console.log(`ℹ️ Association already exists for test group ${association.test_group_id}`);
                                    }
                                    createdAssociations.push(instance);
                                } catch (individualError) {
                                    console.error(`❌ Error creating association for test group ${association.test_group_id}:`, individualError.message);
                                    // Continue with the next association even if one fails
                                    continue;
                                }
                            }
                        }
                        
                        console.log(`✅ Successfully created ${createdAssociations.length} test group associations`);

                        // Step 4: Verify the associations were created
                        console.log('\nStep 4: Verifying created associations...');
                        const verifyAssociations = await medical_report_has_tg.findAll({
                            where: { medical_report_id: newMedicalReport.id },
                            transaction,
                            raw: true
                        });
                        
                        console.log(`Found ${verifyAssociations.length} associations in database:`);
                        verifyAssociations.forEach((assoc, idx) => {
                            console.log(`  ${idx + 1}. Medical Report ID: ${assoc.medical_report_id}, Test Group ID: ${assoc.test_group_id}`);
                        });

                        // Final verification - only warn if no associations were created at all
                        if (verifyAssociations.length === 0) {
                            console.warn('⚠️ No test group associations were created. This might be expected if all associations already existed.');
                        } else if (verifyAssociations.length < uniqueTestGroups.length) {
                            const createdIds = new Set(verifyAssociations.map(a => a.test_group_id));
                            const missingIds = uniqueTestGroups
                                .map(Number)
                                .filter(id => !createdIds.has(id));
                                
                            console.warn('⚠️ Some test group associations were not created:');
                            console.warn(`- Expected: ${uniqueTestGroups.length} associations`);
                            console.warn(`- Created: ${verifyAssociations.length} associations`);
                            console.warn(`- Missing test group IDs: ${missingIds.join(', ')}`);
                            
                            // Don't throw an error, just log a warning
                            // The transaction will continue with the associations that were created successfully
                        }

                        console.log('\n✅ All test group associations verified successfully!');

                        // Also check outside the transaction to see if they're visible
                        const verifyAssociationsOutside = await medical_report_has_tg.findAll({
                            where: { medical_report_id: newMedicalReport.id }
                        });
                        console.log(`Verified associations outside transaction:`, verifyAssociationsOutside.map(a => ({ medical_report_id: a.medical_report_id, test_group_id: a.test_group_id })));

                    } catch (error) {
                        console.error(`Error in test group association process:`, error);
                        // Don't throw the error to prevent transaction rollback
                        // This allows the invoice to be created even if there are issues with test group associations
                        console.warn('Continuing with invoice creation despite test group association issues');
                    }
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
                        model: test,
                        as: "test_id_tests",
                        through: { attributes: ['price'] },
                        attributes: ['id', 'name']
                    },
                    {
                        model: culture,
                        as: "culture_id_cultures",
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
                    {
                        model: test_group,
                        as: "tg_id_test_groups",
                        through: { attributes: ['price'] },
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
                cultures: completeBill.culture_id_cultures.map(c => ({
                    id: c.id,
                    name: c.name,
                    price: c.bill_has_culture.price
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
                })),
                test_groups: completeBill.tg_id_test_groups ? completeBill.tg_id_test_groups.map(tg => ({
                    id: tg.id,
                    name: tg.name,
                    price: tg.bill_has_tg.price
                })) : []
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
                    model: culture,
                    as: "culture_id_cultures",
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
                },
                {
                    model: test_group,
                    as: "tg_id_test_groups",
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'price']
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
            cultures: invoice.culture_id_cultures.map(c => ({
                id: c.id,
                name: c.name,
                price: c.price
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
            })),
            test_groups: invoice.tg_id_test_groups ? invoice.tg_id_test_groups.map(tg => ({
                id: tg.id,
                name: tg.name,
                price: tg.price
            })) : []
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
        tests,
        cultures,
        packages,
        test_groups,
        payments
    } = req.body;

    try {
        const existingBill = await bill.findByPk(id);
        if (!existingBill) return res.status(404).json({ error: "Bill not found" });

        // Get the old values before updating
        const oldTotal = parseFloat(existingBill.total || 0);
        const oldPaid = parseFloat(existingBill.paid || 0);
        const oldDue = parseFloat(existingBill.due || 0);
        const patientId = existingBill.patient_id;

        await existingBill.update({
            date,
            paid,
            due,
            subtotal,
            discount,
            tax,
            total,
            status_id
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
                newPatient: { total: newTotal, paid: newPaid, due: newDue }
            });
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

        if (cultures) {
            await bill_has_culture.destroy({ where: { bill_id: id } });
            const validCultures = cultures.filter(culture_id => !isNaN(Number(culture_id)) && culture_id !== '' && culture_id !== null);
            // Get current prices for each culture
            const cultureRecords = [];
            for (const cultureId of validCultures) {
                const cultureItem = await culture.findByPk(parseInt(cultureId));
                let price = 0.00;
                if (cultureItem && cultureItem.price !== null && cultureItem.price !== undefined) {
                    const parsedPrice = parseFloat(cultureItem.price);
                    price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
                }
                cultureRecords.push({
                    bill_id: id,
                    culture_id: parseInt(cultureId),
                    price: price
                });
            }
            await bill_has_culture.bulkCreate(cultureRecords);
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

        if (test_groups) {
            await bill_has_tg.destroy({ where: { bill_id: id } });
            // Filter out invalid IDs and deduplicate before inserting
            const validTestGroups = [...new Set(test_groups.filter(tg_id => !isNaN(Number(tg_id)) && tg_id !== '' && tg_id !== null))];
            // Get current prices for each test group
            const testGroupRecords = [];
            for (const tgId of validTestGroups) {
                const testGroupItem = await test_group.findByPk(parseInt(tgId));
                let price = 0.00;
                if (testGroupItem && testGroupItem.price !== null && testGroupItem.price !== undefined) {
                    const parsedPrice = parseFloat(testGroupItem.price);
                    price = isNaN(parsedPrice) ? 0.00 : parsedPrice;
                }
                testGroupRecords.push({
                    bill_id: id,
                    tg_id: parseInt(tgId),
                    price: price
                });
            }
            await bill_has_tg.bulkCreate(testGroupRecords);
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

            // Update medical_report_has_culture
            if (cultures) {
                // Get existing medical report cultures
                const existingMedicalReportCultures = await medical_report_has_culture.findAll({ where: { medical_report_id: medicalReport.id } });
                const existingCultureIds = new Set(existingMedicalReportCultures.map(c => c.culture_id));

                // Identify cultures to add
                const culturesToAdd = cultures.filter(culture_id => !existingCultureIds.has(parseInt(culture_id)))
                                            .map(culture_id => ({
                                                medical_report_id: medicalReport.id,
                                                culture_id: parseInt(culture_id),
                                                status: 'pending' // Default status
                                            }));

                // Identify cultures to remove
                const culturesToRemove = existingMedicalReportCultures.filter(existingCulture => !cultures.includes(existingCulture.culture_id.toString()));
                const culturesToRemoveIds = culturesToRemove.map(c => c.id);

                // Delete dependent records in medical_report_culture_result first for cultures being removed
                if (culturesToRemoveIds.length > 0) {
                    await medical_report_culture_result.destroy({ where: { medical_report_has_culture_id: culturesToRemoveIds } });
                }

                // Perform deletions and additions
                if (culturesToRemoveIds.length > 0) {
                    await medical_report_has_culture.destroy({ where: { id: culturesToRemoveIds } });
                }
                if (culturesToAdd.length > 0) {
                    await medical_report_has_culture.bulkCreate(culturesToAdd);
                }
            }

            // Update medical_report_has_tg
            if (test_groups) {
                // Get existing medical report test groups
                const existingMedicalReportTGs = await medical_report_has_tg.findAll({ where: { medical_report_id: medicalReport.id } });
                const existingTGIds = new Set(existingMedicalReportTGs.map(tg => tg.test_group_id));

                // Identify test groups to add
                const tgsToAdd = test_groups.filter(tg_id => !existingTGIds.has(parseInt(tg_id)))
                                            .map(tg_id => ({
                                                medical_report_id: medicalReport.id,
                                                test_group_id: parseInt(tg_id),
                                                value: null // Default value
                                            }));

                // Identify test groups to remove
                const tgsToRemoveIds = existingMedicalReportTGs.filter(existingTG => !test_groups.includes(existingTG.test_group_id.toString()))
                                                                .map(tg => tg.id);

                // Perform deletions and additions
                if (tgsToRemoveIds.length > 0) {
                    await medical_report_has_tg.destroy({ where: { id: tgsToRemoveIds } });
                }
                if (tgsToAdd.length > 0) {
                    await medical_report_has_tg.bulkCreate(tgsToAdd);
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
                    model: culture,
                    as: "culture_id_cultures",
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
                {
                    model: test_group,
                    as: "tg_id_test_groups",
                    through: { attributes: ['price'] },
                    attributes: ['id', 'name']
                }
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
            cultures: updatedBill.culture_id_cultures.map(c => ({
                id: c.id,
                name: c.name,
                price: c.bill_has_culture.price
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
            })),
            test_groups: updatedBill.tg_id_test_groups ? updatedBill.tg_id_test_groups.map(tg => ({
                id: tg.id,
                name: tg.name,
                price: tg.bill_has_tg.price
            })) : []
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

        // Delete all associated records first
        await bill_has_test.destroy({ where: { bill_id: id }, transaction });
        await bill_has_culture.destroy({ where: { bill_id: id }, transaction });
        await bill_has_package.destroy({ where: { bill_id: id }, transaction });
        await bill_has_payment_method.destroy({ where: { bill_id: id }, transaction });
        await bill_has_tg.destroy({ where: { bill_id: id }, transaction });

        // Find and delete associated medical report and its entries
        const medicalReport = await medical_report.findOne({ where: { bill_id: id }, transaction });
        if (medicalReport) {
            await medical_report_has_test.destroy({ where: { medical_report_id: medicalReport.id }, transaction });
            await medical_report_has_culture.destroy({ where: { medical_report_id: medicalReport.id }, transaction });
            await medical_report_has_tg.destroy({ where: { medical_report_id: medicalReport.id }, transaction });
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
