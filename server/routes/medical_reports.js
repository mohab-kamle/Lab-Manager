const express = require('express');
const router = express.Router();
const db = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { Op, where } = require('sequelize');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const XLSX = require('xlsx');
const fs = require('fs');

// Helper function to update medical report dates based on workflow stage
async function updateMedicalReportDates(medicalReportId, stage, transaction = null) {
    try {
        const updateData = {};
        const now = new Date();
        
        switch (stage) {
            case 'registered':
                updateData.registered_at = now;
                break;
            case 'collected':
                updateData.collected_at = now;
                break;
            case 'received':
                updateData.received_at = now;
                break;
            case 'reported':
                updateData.reported_at = now;
                break;
            default:
                console.warn(`Unknown stage: ${stage}`);
                return;
        }
        
        await db.medical_report.update(updateData, {
            where: { id: medicalReportId },
            transaction: transaction
        });
        
        console.log(`Updated medical report ${medicalReportId} with ${stage} date:`, now);
    } catch (error) {
        console.error(`Error updating medical report dates for stage ${stage}:`, error);
        throw error;
    }
}

// Get all medical reports
router.get('/', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist', 'employee'), async (req, res) => {
    try {
        // First, get the count of test groups for each medical report
        const testGroupCounts = await db.medical_report_has_tg.findAll({
            attributes: [
                'medical_report_id',
                [db.sequelize.fn('COUNT', db.sequelize.col('test_group_id')), 'count']
            ],
            group: ['medical_report_id'],
            raw: true
        });

        // Create a map of medical_report_id -> test group count
        const testGroupCountMap = {};
        testGroupCounts.forEach(item => {
            testGroupCountMap[item.medical_report_id] = parseInt(item.count, 10);
        });

        // Then get all medical reports with their associations
        const reports = await db.medical_report.findAll({
            include: [
                {
                    model: db.patient,
                    as: 'patient',
                    attributes: ['id', 'name', 'patientcode', 'birth_date', 'gender']
                },
                {
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { 
                        model: db.medical_report_has_test,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { 
                        model: db.medical_report_has_culture,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.bill,
                    as: 'bill',
                    attributes: ['id', 'date']
                },
                {
                    model: db.admin,
                    as: 'signatory_admin',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.chemist,
                    as: 'signatory',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });

        // Add patient_name, counts, and test group counts to each report for easier access
        const reportsWithPatientName = reports.map(report => {
            const reportData = report.get({ plain: true });
            return {
                ...reportData,
                patient_name: reportData.patient?.name || 'Unknown Patient',
                tests: reportData.test_id_test_medical_report_has_tests || [],
                cultures: reportData.culture_id_culture_medical_report_has_cultures || [],
                tests_count: reportData.test_id_test_medical_report_has_tests ? reportData.test_id_test_medical_report_has_tests.length : 0,
                cultures_count: reportData.culture_id_culture_medical_report_has_cultures ? reportData.culture_id_culture_medical_report_has_cultures.length : 0,
                test_groups_count: testGroupCountMap[reportData.id] || 0,
                invoice_id: reportData.bill?.id || null
            };
        });
        console.log(`Found ${reports.length} medical reports`);
        res.json(reportsWithPatientName);
    } catch (error) {
        console.error('Error fetching medical reports:', error);
        res.status(500).json({ error: 'Failed to fetch medical reports' });
    }
});

// Get a specific medical report by ID
router.get('/:id', authenticateUser, authorizeRoles('admin', 'doctor', 'chemist', 'receptionist', 'employee'), async (req, res) => {
    try {
        const report = await db.medical_report.findByPk(req.params.id, {
            include: [
                { 
                    model: db.patient, 
                    as: 'patient',
                    attributes: ['id', 'name', 'birth_date', 'gender', 'patientcode'] 
                },
                { 
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { attributes: ['result', 'status'] },
                    include: [
                        {
                            model: db.test_component,
                            as: 'test_components',
                            attributes: ['unit', 'normal_from', 'normal_to', 'gender', 'age_start', 'age_end']
                        }
                    ]
                },
                // Remove the problematic culture association and query it separately
                // Add the hasMany association for medical_report_has_culture
                {
                    model: db.medical_report_has_culture,
                    as: 'medical_report_has_cultures',
                    include: [
                        {
                            model: db.culture,
                            as: 'culture',
                            attributes: ['id', 'name', 'price', 'sample_type_id', 'category_id']
                        },
                        {
                            model: db.medical_report_has_culture_antibiotic,
                            as: 'culture_antibiotics',
                            include: [
                                {
                                    model: db.antibiotic,
                                    as: 'antibiotic',
                                    attributes: ['id', 'name', 'shortcut', 'commercial_name']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: db.bill,
                    as: 'bill',
                    attributes: ['id', 'date']
                },
                {
                    model: db.admin,
                    as: 'signatory_admin',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.chemist,
                    as: 'signatory',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.test_group,
                    as: 'tg_id_test_groups',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                    include: [
                        { 
                            model: db.tg_component, 
                            as: 'tg_components', 
                            attributes: ['id', 'name', 'test_category_id'],
                            required: false, 
                            include: [ 
                                { 
                                    model: db.tgc_category, 
                                    as: 'category', 
                                    attributes: ['id', 'name'],
                                    required: false  // Make this LEFT OUTER JOIN
                                } 
                            ] 
                        },
                        { model: db.tg_fields, as: 'tg_fields', attributes: ['id', 'name'] },
                    ]
                },
                {
                    model: db.medical_report_tg_field_value,
                    as: 'medical_report_tg_field_values',
                    attributes: ['tg_component_id', 'tg_fields_id', 'value'],
                }
            ]
        });
        
        if (!report) {
            return res.status(404).json({ error: 'Medical report not found' });
        }
        
        // Add top-level tests and cultures fields for frontend compatibility
        const reportData = report.get({ plain: true });

        // Debug log to see what tg_components are being returned
        if (reportData.tg_id_test_groups && reportData.tg_id_test_groups.length > 0) {
            console.log('tg_components:', JSON.stringify(reportData.tg_id_test_groups[0].tg_components, null, 2));
        }

        // Remap associations to top-level for frontend convenience
        reportData.tests = (reportData.test_id_test_medical_report_has_tests || []).map(t => ({ ...t, ...t.medical_report_has_test }));
        
        // Map cultures from the medical_report_has_cultures association
        reportData.cultures = (reportData.medical_report_has_cultures || []).map(mrc => ({
            ...mrc.culture,
            medical_report_has_culture: {
                id: mrc.id,
                result: mrc.result,
                status: mrc.status
            },
            culture_antibiotics: mrc.culture_antibiotics || []
        }));

        // Ensure test_groups are properly structured with their values
        const values = reportData.medical_report_tg_field_values || [];
        reportData.test_groups = (reportData.tg_id_test_groups || []).map(tg => {
            // Direct components: those with test_category_id == null
            const direct_components = (tg.tg_components || []).filter(comp => comp.test_category_id == null).map(comp => ({
                id: comp.id,
                name: comp.name,
                category: null
            }));
            // Categories and their components
            const categories = [];
            // Build a map of category id to category name
            const catMap = {};
            (tg.tg_components || []).forEach(comp => {
                if (comp.test_category_id && comp.category) {
                    if (!catMap[comp.test_category_id]) {
                        catMap[comp.test_category_id] = {
                            id: comp.test_category_id,
                            name: comp.category.name,
                            components: []
                        };
                    }
                    catMap[comp.test_category_id].components.push({
                        id: comp.id,
                        name: comp.name,
                        category: comp.category.name
                    });
                }
            });
            for (const catId in catMap) {
                categories.push(catMap[catId]);
            }
            // Fields
            const fields = tg.tg_fields || [];
            // Values
            const valueMap = {};
            values
                .filter(fv => (tg.tg_components || []).some(c => c.id === fv.tg_component_id))
                .forEach(fv => {
                    if (!valueMap[fv.tg_component_id]) {
                        valueMap[fv.tg_component_id] = {};
                    }
                    valueMap[fv.tg_component_id][fv.tg_fields_id] = fv.value;
                });
            return {
                ...tg,
                direct_components,
                categories,
                fields,
                values: valueMap
            };
        });
        res.json(reportData);
    } catch (error) {
        console.error('Error fetching medical report:', error);
        res.status(500).json({ error: 'Failed to fetch medical report' });
    }
});

// Create a new medical report
router.post('/', authenticateUser, authorizeRoles('admin', 'doctor', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const { 
            patient_id, 
            doctor_id, 
            diagnosis, 
            test_ids, 
            culture_ids,
            registered_at,
            collected_at,
            received_at,
            reported_at
        } = req.body;

        // Validate required fields
        if (!patient_id || !doctor_id || !diagnosis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create the medical report
        const report = await db.medical_report.create({
            patient_id,
            doctor_id,
            diagnosis,
            date: new Date(),
            registered_at: registered_at || new Date(),
            collected_at: collected_at || null,
            received_at: received_at || null,
            reported_at: reported_at || null
        });

        // Associate tests if provided
        if (test_ids && test_ids.length > 0) {
            await report.setTests(test_ids);
        }

        // Associate cultures if provided
        if (culture_ids && culture_ids.length > 0) {
            await report.setCultures(culture_ids);
        }

        // Fetch the created report with associations
        const createdReport = await db.medical_report.findByPk(report.id, {
            include: [
                {
                    model: db.patient,
                    as: 'patient',
                    attributes: ['id', 'name', 'patientcode', 'birth_date', 'gender']
                },
                {
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { 
                        model: db.medical_report_has_test,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { 
                        model: db.medical_report_has_culture,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.bill,
                    as: 'bill',
                    attributes: ['id', 'date']
                },
                {
                    model: db.admin,
                    as: 'signatory_admin',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.chemist,
                    as: 'signatory',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });

        res.status(201).json(createdReport);
    } catch (error) {
        console.error('Error creating medical report:', error);
        res.status(500).json({ error: 'Failed to create medical report' });
    }
});

// Update a medical report
router.put('/:id', authenticateUser, authorizeRoles('admin', 'doctor', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const { 
            diagnosis, 
            test_results, 
            culture_results, 
            done, 
            pending, 
            comment, 
            signatory_name, 
            signatory_id, 
            signatory_admin_id,
            date,
            registered_at,
            collected_at,
            received_at,
            reported_at
        } = req.body;
        
        const report = await db.medical_report.findByPk(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Medical report not found' });
        }

        // Update fields if provided
        const updateFields = {};
        
        if (diagnosis !== undefined) updateFields.diagnosis = diagnosis;
        if (done !== undefined) {
            updateFields.done = done;
            // Update reported_at date when report is marked as done
            if (done === true) {
                updateFields.reported_at = new Date();
            }
        }
        if (pending !== undefined) updateFields.pending = pending;
        if (comment !== undefined) updateFields.comment = comment;
        if (signatory_name !== undefined) updateFields.signatory_name = signatory_name;
        if (signatory_id !== undefined) updateFields.signatory_id = signatory_id;
        if (signatory_admin_id !== undefined) updateFields.signatory_admin_id = signatory_admin_id;
        if (date !== undefined) updateFields.date = date;
        if (registered_at !== undefined) updateFields.registered_at = registered_at;
        if (collected_at !== undefined) updateFields.collected_at = collected_at;
        if (received_at !== undefined) updateFields.received_at = received_at;
        if (reported_at !== undefined) updateFields.reported_at = reported_at;

        // Update the report
        await report.update(updateFields);

        // Update test results if provided
        if (test_results) {
            for (const testResult of test_results) {
                await db.medical_report_has_test.update(
                    {
                        status: testResult.status,
                        result: testResult.result
                    },
                    {
                        where: {
                            medical_report_id: report.id,
                            test_id: testResult.test_id
                        }
                    }
                );
            }
        }

        // Update culture results if provided
        if (culture_results) {
            for (const cultureResult of culture_results) {
                await db.medical_report_has_culture.update(
                    {
                        status: cultureResult.status,
                        result: cultureResult.result
                    },
                    {
                        where: {
                            medical_report_id: report.id,
                            culture_id: cultureResult.culture_id
                        }
                    }
                );
            }
        }

        // Fetch the updated report with associations
        const updatedReport = await db.medical_report.findByPk(report.id, {
            include: [
                {
                    model: db.patient,
                    as: 'patient',
                    attributes: ['id', 'name', 'patientcode', 'birth_date', 'gender']
                },
                {
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { 
                        model: db.medical_report_has_test,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { 
                        model: db.medical_report_has_culture,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.bill,
                    as: 'bill',
                    attributes: ['id', 'date']
                },
                {
                    model: db.admin,
                    as: 'signatory_admin',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.chemist,
                    as: 'signatory',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.employee,
                            as: 'id_employee',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });

        res.json(updatedReport);
    } catch (error) {
        console.error('Error updating medical report:', error);
        res.status(500).json({ error: 'Failed to update medical report' });
    }
});

// Delete a medical report
router.delete('/:id', authenticateUser, authorizeRoles('admin', 'doctor', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const report = await db.medical_report.findByPk(req.params.id);
        
        if (!report) {
            return res.status(404).json({ error: 'Medical report not found' });
        }

        await report.destroy();
        res.json({ message: 'Medical report deleted successfully' });
    } catch (error) {
        console.error('Error deleting medical report:', error);
        res.status(500).json({ error: 'Failed to delete medical report' });
    }
});

// Get test components for a specific test
router.get('/test/:testId/components', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
    try {
        const testComponents = await db.test_component.findAll({
            where: { test_id: req.params.testId },
            attributes: ['id', 'name', 'unit', 'normal_from', 'normal_to', 'gender', 'age_start', 'age_end']
        });
        
        res.json(testComponents);
    } catch (error) {
        console.error('Error fetching test components:', error);
        res.status(500).json({ error: 'Failed to fetch test components' });
    }
});

// Update test and culture results with auto-calculation
router.put('/:id/results', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
    try {
        const { test_results, culture_results} = req.body;
        const reportId = req.params.id;

        // Helper function to calculate test status based on result and normal range
        const calculateTestStatus = (result, normalRange) => {
            if (!result || !normalRange) return 'pending';
            
            const range = normalRange.replace(/\s/g, ''); // Remove spaces
            const match = range.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
            
            if (!match) return 'pending';
            
            const min = parseFloat(match[1]);
            const max = parseFloat(match[2]);
            const value = parseFloat(result);
            
            if (isNaN(value)) return 'pending';
            
            if (value < min) {
                return value < min * 0.5 ? 'critical low' : 'low';
            } else if (value > max) {
                return value > max * 1.5 ? 'critical high' : 'high';
            } else {
                return 'normal';
            }
        };

        // Update test results with auto-calculated status
        if (test_results) {
            for (const testResult of test_results) {
                const testComponents = await db.test_component.findAll({
                    where: { test_id: testResult.test_id }
                });

                // For now, we'll use the first component's normal range
                // In a more complex system, you might want to handle multiple components per test
                const normalRange = testComponents.length > 0 ? `${testComponents[0].normal_from} - ${testComponents[0].normal_to}` : null;
                const calculatedStatus = calculateTestStatus(testResult.result, normalRange);

                // Sanitize result: if empty string, null, or not a valid number, set to null
                let sanitizedResult = testResult.result;
                if (sanitizedResult === "" || sanitizedResult === null || isNaN(Number(sanitizedResult))) {
                    sanitizedResult = null;
                } else {
                    sanitizedResult = Number(sanitizedResult);
                }

                await db.medical_report_has_test.update(
                    {
                        status: calculatedStatus,
                        result: sanitizedResult
                    },
                    {
                        where: {
                            medical_report_id: reportId,
                            test_id: testResult.test_id
                        }
                    }
                );
            }
        }

        // Update culture results
        if (culture_results) {
            for (const cultureResult of culture_results) {
                // For cultures, we'll set status to 'done' if result is provided
                const status = cultureResult.result ? 'done' : 'pending';
                
                await db.medical_report_has_culture.update(
                    {
                        status: status,
                        result: cultureResult.result
                    },
                    {
                        where: {
                            medical_report_id: reportId,
                            culture_id: cultureResult.culture_id
                        }
                    }
                );
            }
        }

        // Fetch the updated report with all associations
        const updatedReport = await db.medical_report.findByPk(reportId, {
            include: [
                {
                    model: db.patient,
                    as: 'patient',
                    attributes: ['id', 'name', 'patientcode', 'birth_date', 'gender']
                },
                {
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { 
                        model: db.medical_report_has_test,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { 
                        model: db.medical_report_has_culture,
                        attributes: ['status', 'result']
                    },
                    attributes: ['id', 'name']
                },
                {
                    model: db.bill,
                    as: 'bill',
                    attributes: ['id', 'date']
                }
            ]
        });

        res.json(updatedReport);
    } catch (error) {
        console.error('Error updating results:', error);
        res.status(500).json({ error: 'Failed to update results' });
    }
});

// Get pending reports count
router.get('/pending-count', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const count = await db.medical_report.count({ where: { pending: true } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending reports count' });
  }
});

// Get recent reports
router.get('/recent', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const reports = await db.medical_report.findAll({
      order: [['date', 'DESC']],
      limit: 5,
      include: [
        { model: db.patient, as: 'patient', attributes: ['id', 'name'] }
      ]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recent reports' });
  }
});

// Increment prints_number for a medical report
router.put('/:id/increment-prints', authenticateUser, authorizeRoles('admin','chemist', 'receptionist'), async (req, res) => {
    try {
        const report = await db.medical_report.findByPk(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Medical report not found' });
        }
        report.prints_number = (report.prints_number || 0) + 1;
        await report.save();
        res.json(report);
    } catch (error) {
        console.error('Error incrementing prints_number:', error);
        res.status(500).json({ error: 'Failed to increment prints_number' });
    }
});

// Get test groups for a medical report
router.get('/:id/test-groups', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    try {
        // First get all test groups associated with this medical report through the junction table
        // Include soft-deleted test groups for existing medical reports to preserve data
        const reportTestGroups = await db.medical_report_has_tg.findAll({
            where: { medical_report_id: req.params.id },
            attributes: ['medical_report_id', 'test_group_id', 'value'],
            include: [
                {
                    model: db.test_group,
                    as: 'test_group',
                    attributes: ['id', 'name', 'price', 'deleted_at'],
                    include: [
                        {
                            model: db.tg_component,
                            as: 'tg_components',
                            attributes: ['id', 'test_group_id', 'test_category_id', 'name'],
                        },
                        {
                            model: db.tgc_category,
                            as: 'tgc_categories',
                            attributes: ['id', 'name', 'test_group_id'],
                            include: [
                                {
                                    model: db.tg_component,
                                    as: 'tg_components',
                                    attributes: ['id', 'test_group_id', 'test_category_id', 'name'],
                                }
                            ]
                        },
                        {
                            model: db.tg_fields,
                            as: 'tg_fields',
                            attributes: ['id', 'name', 'test_group_id']
                        },
                        {
                            model: db.field_comp_options,
                            as: 'field_comp_options',
                            required: false,
                            attributes: ['id', 'name', 'tg_component_id', 'tg_fields_id', 'test_group_id']
                        }
                    ]
                }
            ]
        });

        // Get all field values for this medical report
        const fieldValues = await db.medical_report_tg_field_value.findAll({
            where: { medical_report_id: req.params.id }
        });

        // Format the response
        const testGroups = reportTestGroups.map(rtg => {
            const group = rtg.test_group;
            if (!group) return null;

            // Create a map of component_id -> field_id -> value
            const valueMap = {};
            fieldValues
                .filter(fv => fv.test_group_id === group.id)
                .forEach(fv => {
                    if (!valueMap[fv.tg_component_id]) {
                        valueMap[fv.tg_component_id] = {};
                    }
                    valueMap[fv.tg_component_id][fv.tg_fields_id] = fv.value;
                });

            // Map field_comp_options to include in the response
            const fieldCompOptions = group.field_comp_options?.map(opt => ({
                id: opt.id,
                name: opt.name,
                tg_component_id: opt.tg_component_id,
                tg_fields_id: opt.tg_fields_id,
                test_group_id: opt.test_group_id
            })) || [];

            // Direct components: those with test_category_id == null
            const direct_components = (group.tg_components || []).filter(comp => comp.test_category_id == null).map(comp => ({
                id: comp.id,
                name: comp.name,
                category: null
            }));

            // Categories and their components
            const categories = (group.tgc_categories || []).map(cat => ({
                id: cat.id,
                name: cat.name,
                components: (cat.tg_components || []).map(comp => ({
                    id: comp.id,
                    name: comp.name,
                    category: cat.name
                }))
            }));

            // All fields
            const fields = group.tg_fields?.map(field => ({
                id: field.id,
                name: field.name,
                field_comp_options: fieldCompOptions
                    .filter(opt => opt.tg_fields_id === field.id)
                    .map(opt => ({
                        id: opt.id,
                        name: opt.name,
                        tg_component_id: opt.tg_component_id,
                        tg_fields_id: opt.tg_fields_id
                    }))
            })) || [];

            return {
                id: group.id,
                name: group.name,
                direct_components,
                categories,
                fields,
                values: valueMap
            };
        }).filter(Boolean); // Remove any null entries

        // Verify the medical report exists
        const report = await db.medical_report.findByPk(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Medical report not found' });
        }
        res.json(testGroups);
    } catch (error) {
        console.error('Error fetching test groups for report:', error);
        res.status(500).json({ error: 'Failed to fetch test groups' });
    }
});

// Helper function to save test group values with retry on deadlock
async function saveTestGroupValuesWithRetry(medical_report_id, test_group_id, values, maxRetries = 3) {
    let retryCount = 0;
    let lastError;

    while (retryCount < maxRetries) {
        const t = await db.sequelize.transaction();
        try {
            // Validate that the medical report exists
            const report = await db.medical_report.findByPk(medical_report_id, { transaction: t });
            if (!report) {
                const error = new Error(`Medical report with ID ${medical_report_id} not found`);
                error.status = 404;
                throw error;
            }

            // Validate that the test group exists
            const testGroup = await db.test_group.findByPk(test_group_id, { transaction: t });
            if (!testGroup) {
                const error = new Error(`Test group with ID ${test_group_id} not found`);
                error.status = 404;
                throw error;
            }

            // Prepare operations
            const operations = [];
            
            // Convert values object to array of field values
            Object.entries(values).forEach(([component_id, fields]) => {
                if (!component_id) {
                    console.warn('Skipping empty component_id');
                    return;
                }
                
                Object.entries(fields).forEach(([field_id, value]) => {
                    if (!field_id) {
                        console.warn('Skipping empty field_id for component:', component_id);
                        return;
                    }
                    
                    operations.push({
                        medical_report_id: parseInt(medical_report_id, 10),
                        test_group_id: parseInt(test_group_id, 10),
                        tg_component_id: parseInt(component_id, 10),
                        tg_fields_id: parseInt(field_id, 10),
                        value: value !== null && value !== undefined ? String(value) : null
                    });
                });
            });

            console.log('Prepared operations:', operations);

            // Delete existing values for this report and test group
            const deleteResult = await db.medical_report_tg_field_value.destroy({
                where: {
                    medical_report_id: parseInt(medical_report_id, 10),
                    test_group_id: parseInt(test_group_id, 10)
                },
                transaction: t
            });
            console.log(`Deleted ${deleteResult} existing records`);

            // Insert new values if there are any
            if (operations.length > 0) {
                console.log('Inserting new values...');
                await db.medical_report_tg_field_value.bulkCreate(operations, {
                    transaction: t,
                    updateOnDuplicate: ['value'],
                    validate: true,
                    individualHooks: true
                });
                console.log('Successfully inserted new values');
            } else {
                console.log('No values to insert');
            }

            await t.commit();
            console.log('Transaction committed successfully');
            return { success: true };
            
        } catch (error) {
            // Always rollback the transaction on error
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }

            // If this is a deadlock and we have retries left, try again
            if ((error.original?.code === 'ER_LOCK_DEADLOCK' || error.name === 'SequelizeDatabaseError') && 
                retryCount < maxRetries - 1) {
                retryCount++;
                const delay = Math.pow(2, retryCount) * 100; // Exponential backoff
                console.warn(`Deadlock detected, retrying (${retryCount}/${maxRetries}) after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // If we get here, either it's not a deadlock or we're out of retries
            lastError = error;
            throw error;
        }
    }
    
    throw lastError || new Error('Failed to save test group values after multiple attempts');
}

// Save test group values for a medical report
router.post('/:id/test-groups', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const { test_group_id, values } = req.body;
        const medical_report_id = req.params.id;

        console.log('Received request to save test group values:', {
            medical_report_id,
            test_group_id,
            values
        });

        // Validate required fields
        if (!test_group_id || values === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields: test_group_id and values are required' 
            });
        }

        // Call the save function with retry logic
        const result = await saveTestGroupValuesWithRetry(
            medical_report_id,
            test_group_id,
            values
        );

        res.json(result);
        
    } catch (error) {
        console.error('Error in save test group values endpoint:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            ...(error.errors && { errors: error.errors }),
            ...(error.fields && { fields: error.fields })
        });
        
        const status = error.status || 500;
        const message = error.message || 'Failed to save test group values';
        
        res.status(status).json({ 
            error: message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update medical report to include test group count
router.get('/', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const reports = await db.medical_report.findAll({
            include: [
                // ... existing includes ...
                {
                    model: db.test_group,
                    as: 'test_groups',
                    through: { attributes: [] },
                    attributes: []
                }
            ],
            attributes: {
                include: [
                    [
                        db.sequelize.fn('COUNT', db.sequelize.col('test_groups.id')),
                        'test_groups_count'
                    ]
                ]
            },
            group: ['medical_report.id']
        });

        // ... rest of the existing code ...
        const reportsWithPatientName = reports.map(report => {
            const reportData = report.get({ plain: true });
            return {
                ...reportData,
                patient_name: reportData.patient?.name || 'Unknown Patient',
                tests: reportData.test_id_test_medical_report_has_tests || [],
                cultures: reportData.culture_id_culture_medical_report_has_cultures || [],
                tests_count: reportData.test_id_test_medical_report_has_tests ? reportData.test_id_test_medical_report_has_tests.length : 0,
                cultures_count: reportData.culture_id_culture_medical_report_has_cultures ? reportData.culture_id_culture_medical_report_has_cultures.length : 0,
                test_groups_count: reportData.test_groups ? reportData.test_groups.length : 0,
                invoice_id: reportData.bill?.id || null
            };
        });
        // ... rest of the existing code ...
    } catch (error) {
        console.error('Error fetching medical reports:', error);
        res.status(500).json({ error: 'Failed to fetch medical reports' });
    }
});

// Save test result
router.post('/:reportId/tests/:testId/result', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { reportId, testId } = req.params;
        const { result, status = 'pending' } = req.body;

        console.log(`Attempting to save test result:`, {
            reportId,
            testId,
            result,
            status
        });

        // First, verify the medical report exists
        const medicalReport = await db.medical_report.findByPk(reportId, { transaction: t });
        if (!medicalReport) {
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            return res.status(404).json({ error: 'Medical report not found' });
        }

        // Verify the test exists
        const test = await db.test.findByPk(testId, { transaction: t });
        if (!test) {
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            return res.status(404).json({ error: 'Test not found' });
        }

        // Find the medical report test entry
        const reportTest = await db.medical_report_has_test.findOne({
            where: {
                medical_report_id: reportId,
                test_id: testId
            },
            transaction: t
        });

        if (!reportTest) {
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            
            // Provide more detailed error information
            const allTestsInReport = await db.medical_report_has_test.findAll({
                where: { medical_report_id: reportId },
                attributes: ['test_id'],
                transaction: t
            });
            
            console.error(`Test association not found. Medical report ${reportId} has ${allTestsInReport.length} tests:`, 
                allTestsInReport.map(t => t.test_id));
            
            return res.status(404).json({ 
                error: 'Test not found in this medical report',
                details: {
                    medicalReportId: reportId,
                    testId: testId,
                    availableTests: allTestsInReport.map(t => t.test_id),
                    testName: test.name,
                    medicalReportDate: medicalReport.date
                }
            });
        }

        // Update the test result
        await db.medical_report_has_test.update(
            { 
                result: result || null,
                status: status || 'pending',
                updatedAt: new Date()
            },
            {
                where: {
                    medical_report_id: reportId,
                    test_id: testId
                },
                transaction: t
            }
        );

        // Update received_at date when first test result is entered
        const resultStr = result !== null && result !== undefined ? String(result) : '';
        if (resultStr.trim()) {
            await updateMedicalReportDates(reportId, 'received', t);
        }

        await t.commit();
        console.log(`Successfully saved test result for medical report ${reportId}, test ${testId}`);
        res.json({ success: true });
    } catch (error) {
        if (t && !t.finished) {
            try {
                await t.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        console.error('Error saving test result:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        res.status(500).json({ error: 'Failed to save test result' });
    }
});

// Update collected date
router.post('/:reportId/collected', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { reportId } = req.params;
        
        // Update the collected_at date
        await updateMedicalReportDates(reportId, 'collected', t);
        
        await t.commit();
        res.json({ success: true });
    } catch (error) {
        if (t && !t.finished) {
            try {
                await t.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        console.error('Error updating collected date:', error);
        res.status(500).json({ error: 'Failed to update collected date' });
    }
});

// Save culture result
router.post('/:reportId/cultures/:cultureId/result', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { reportId, cultureId } = req.params;
        const { result, status = 'pending' } = req.body;

        console.log(`Attempting to save culture result:`, {
            reportId,
            cultureId,
            result,
            status
        });

        // First, verify the medical report exists
        const medicalReport = await db.medical_report.findByPk(reportId, { transaction: t });
        if (!medicalReport) {
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            return res.status(404).json({ error: 'Medical report not found' });
        }

        // Verify the culture exists
        const culture = await db.culture.findByPk(cultureId, { transaction: t });
        if (!culture) {
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            return res.status(404).json({ error: 'Culture not found' });
        }

        // Find the medical report culture entry
        const reportCulture = await db.medical_report_has_culture.findOne({
            where: {
                medical_report_id: reportId,
                culture_id: cultureId
            },
            transaction: t
        });

        if (!reportCulture) {
            if (t && !t.finished) {
                try {
                    await t.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            
            // Provide more detailed error information
            const allCulturesInReport = await db.medical_report_has_culture.findAll({
                where: { medical_report_id: reportId },
                attributes: ['culture_id']
            });
            
            console.error(`Culture association not found. Medical report ${reportId} has ${allCulturesInReport.length} cultures:`, 
                allCulturesInReport.map(c => c.culture_id));
            
            return res.status(404).json({ 
                error: 'Culture not found in this medical report',
                details: {
                    medicalReportId: reportId,
                    cultureId: cultureId,
                    availableCultures: allCulturesInReport.map(c => c.culture_id),
                    cultureName: culture.name,
                    medicalReportDate: medicalReport.date
                }
            });
        }

        // For cultures, set status to 'done' if result is provided, otherwise use the provided status
        const finalStatus = result && result.trim() ? 'done' : (status || 'pending');

        // Update the culture result
        await db.medical_report_has_culture.update(
            { 
                result: result || null,
                status: finalStatus,
                updatedAt: new Date()
            },
            {
                where: {
                    medical_report_id: reportId,
                    culture_id: cultureId
                },
                transaction: t
            }
        );

        // Update received_at date when first culture result is entered
        if (result && result.trim()) {
            await updateMedicalReportDates(reportId, 'received', t);
        }

        await t.commit();
        console.log(`Successfully saved culture result for medical report ${reportId}, culture ${cultureId}`);
        res.json({ success: true });
    } catch (error) {
        if (t && !t.finished) {
            try {
                await t.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        console.error('Error saving culture result:', error);
        res.status(500).json({ error: 'Failed to save culture result' });
    }
});

// Diagnostic endpoint to check test associations
router.get('/:reportId/tests/check', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const { reportId } = req.params;
        
        // Get the medical report with all its test associations
        const medicalReport = await db.medical_report.findByPk(reportId, {
            include: [
                {
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { attributes: ['id', 'result', 'status'] },
                    attributes: ['id', 'name']
                },
                {
                    model: db.medical_report_has_test,
                    as: 'medical_report_has_tests',
                    attributes: ['id', 'test_id', 'result', 'status']
                }
            ]
        });

        if (!medicalReport) {
            return res.status(404).json({ error: 'Medical report not found' });
        }

        // Also get all tests in the system for comparison
        const allTests = await db.test.findAll({
            attributes: ['id', 'name']
        });

        res.json({
            medicalReport: {
                id: medicalReport.id,
                date: medicalReport.date,
                patient_id: medicalReport.patient_id
            },
            associatedTests: medicalReport.test_id_test_medical_report_has_tests || [],
            testAssociations: medicalReport.medical_report_has_tests || [],
            allTests: allTests,
            summary: {
                totalTestsInSystem: allTests.length,
                testsAssociatedWithReport: medicalReport.test_id_test_medical_report_has_tests?.length || 0,
                testAssociationsCount: medicalReport.medical_report_has_tests?.length || 0
            }
        });
    } catch (error) {
        console.error('Error checking test associations:', error);
        res.status(500).json({ error: 'Failed to check test associations' });
    }
});

// Diagnostic endpoint to check culture associations
router.get('/:reportId/cultures/check', authenticateUser, authorizeRoles('admin', 'chemist', 'receptionist'), async (req, res) => {
    try {
        const { reportId } = req.params;
        
        // Get the medical report with all its culture associations
        const medicalReport = await db.medical_report.findByPk(reportId, {
            include: [
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { attributes: ['id', 'result', 'status'] },
                    attributes: ['id', 'name']
                },
                {
                    model: db.medical_report_has_culture,
                    as: 'medical_report_has_cultures',
                    attributes: ['id', 'culture_id', 'result', 'status']
                }
            ]
        });

        if (!medicalReport) {
            return res.status(404).json({ error: 'Medical report not found' });
        }

        // Also get all cultures in the system for comparison
        const allCultures = await db.culture.findAll({
            attributes: ['id', 'name']
        });

        res.json({
            medicalReport: {
                id: medicalReport.id,
                date: medicalReport.date,
                patient_id: medicalReport.patient_id
            },
            associatedCultures: medicalReport.culture_id_culture_medical_report_has_cultures || [],
            cultureAssociations: medicalReport.medical_report_has_cultures || [],
            allCultures: allCultures,
            summary: {
                totalCulturesInSystem: allCultures.length,
                culturesAssociatedWithReport: medicalReport.culture_id_culture_medical_report_has_cultures?.length || 0,
                cultureAssociationsCount: medicalReport.medical_report_has_cultures?.length || 0
            }
        });
    } catch (error) {
        console.error('Error checking culture associations:', error);
        res.status(500).json({ error: 'Failed to check culture associations' });
    }
});

// Import medical reports from Excel/CSV
router.post('/import', authenticateUser, authorizeRoles('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    let imported = 0, updated = 0, errors = [];
    for (const row of data) {
      if (!row['Patient ID']) {
        errors.push(`Missing required field Patient ID in row: ${JSON.stringify(row)}`);
        continue;
      }
      let report = null;
      if (row.ID) {
        report = await db.medical_report.findByPk(row.ID);
      }
      const reportData = {
        patient_id: row['Patient ID'],
        date: row.Date || null,
        prints_number: row.Prints || 0,
        whatsapp_sends: row['WhatsApp Sends'] || 0,
        done: row.Done || 0,
        signatory_id: row['Signatory ID'] || null,
        pending: row.Pending || 0,
        comment: row.Comment || null,
        signatory_admin_id: row['Signatory Admin ID'] || null,
        signatory_name: row['Signatory Name'] || null,
        bill_id: row['Bill ID'] || null
      };
      if (report) {
        await report.update(reportData);
        updated++;
      } else {
        await db.medical_report.create(reportData);
        imported++;
      }
    }
    fs.unlinkSync(req.file.path);
    res.json({ imported, updated, errors });
  } catch (error) {
    console.error('Error importing medical reports:', error);
    res.status(500).json({ error: 'Failed to import medical reports' });
    }
});

module.exports = router; 