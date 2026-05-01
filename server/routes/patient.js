const express = require("express");
const router = express.Router();
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { medical_report, patient, admin, chemist, phone_number, diseases, patient_has_diseases, contract, lab_contracts_doctor, bill, financial_transaction, payment_method, packages_and_offers, employee, branch, test} = require("../models");
const { sign } = require("jsonwebtoken");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const multer = require("multer");
const { readExcelBuffer, validateExcelBuffer } = require('../services/excelService');
const { loginLimiter } = require('../middleware/rateLimiters');
require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
const { sequelize } = require("../models");
const db = require('../models');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Function to generate random patient code (fits within INTEGER range)
const generatePatientCode = async (labId) => {
    let patientCode;
    let exists = true;

    while (exists) {
        // Generate random 9-digit number (fits within INTEGER range: max 2147483647)
        patientCode = Math.floor(100000000 + Math.random() * 900000000);

        // Check if it exists within the same lab
        const existingPatient = await patient.findOne({
            where: {
                patientcode: patientCode,
                lab_id: labId
            }
        });
        exists = !!existingPatient;
    }

    return patientCode;
};

// Helper function to normalize phone number to E.164 format
const normalizePhone = (phoneStr) => {
    if (!phoneStr) return null;
    try {
        const phoneNumber = parsePhoneNumberFromString(phoneStr);
        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
        // If not valid but starts with +, keep as is (best effort)
        if (phoneStr.startsWith('+')) return phoneStr;
        return phoneStr; // Fallback
    } catch (e) {
        return phoneStr;
    }
};

router.post("/login", loginLimiter, async (req, res) => {
    const { patientcode } = req.body;

    // Validate patientcode to prevent object injection
    if (!patientcode || typeof patientcode === 'object') {
        return res.status(400).json({ error: "Invalid patient code format" });
    }

    try {
        // 🛡️ Sentinel: Validate input to prevent Object Injection
        if (!patientcode || (typeof patientcode !== 'string' && typeof patientcode !== 'number')) {
            return res.status(400).json({ error: "Invalid patient code format" });
        }

        const Patient = await patient.findOne({
            where: {
                patientcode: String(patientcode) // Explicitly cast to string/value to prevent object injection
            }
        });

        if (!Patient) {
            return res.status(401).json({ error: "Invalid patient code or lab" });
        }

        // ✅ Generate token with user details including lab_id
        const token = sign({
            id: Patient.id,
            role: "patient",
            lab_id: Patient.lab_id
        }, SECRET_KEY, {
            expiresIn: "6h",
        });
        const phones = await phone_number.findAll({ where: { patient_id: Patient.id } });
        const user = { ...Patient.get(), role: "patient", phones };
        // ✅ Return patient details with token
        res.json({
            token,
            user
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server error, please try again later." });
    }
});

router.get(
    "/reports",
    authenticateUser,
    authorizeRoles("patient"),
    tenantContext,
    async (req, res) => {
        const userId = req.user.id; // Assuming this comes from JWT

        const query = `
      SELECT
    mr.id AS id,
    mr.date AS date,
    mr.done,
    mr.pending,
    mr.comment,
    mr.signatory_name AS doctor_name,
    t.name AS test_name,
    t.price,
    mrht.status,
    mrht.result
    FROM
    medical_report mr
    LEFT JOIN patient p ON p.id = mr.patient_id
    LEFT JOIN chemist c ON c.id = mr.signatory_id
    LEFT JOIN admin a ON a.id = mr.signatory_admin_id
    LEFT JOIN medical_report_has_test mrht ON mrht.medical_report_id = mr.id
    INNER JOIN test t ON mrht.test_id = t.id
    WHERE
    mr.patient_id = :userId
    AND mr.lab_id = :labId;
    `;

        try {
            // Use `sequelize.query` with `SELECT` to ensure array of results
            const results = await sequelize.query(query, {
                replacements: {
                    userId,
                    labId: req.tenant.lab_id
                },
                type: sequelize.QueryTypes.SELECT, // Ensure the type is `SELECT`
            });
            // Process the query result to group by 'medical_report.id'
            const groupedReports = results.reduce((acc, row) => {
                // Find the medical report by ID (or create a new one if it doesn't exist)
                let report = acc.find((r) => r.id === row.id);

                if (!report) {
                    report = {
                        id: row.id,
                        date: row.date,
                        done: row.done,
                        pending: row.pending,
                        comment: row.comment,
                        doctor_name: row.doctor_name,
                        patient_name: row.patient_name,
                        patientcode: row.patientcode,
                        tests: [],
                    };
                    acc.push(report);
                }
                // Push the test into the appropriate medical report's 'tests' array
                report.tests.push({
                    test_name: row.test_name,
                    price: row.price,
                    status: row.status,
                    result: row.result,
                });
                return acc;
            }, []);

            // Send the grouped data as JSON to the front-end
            res.json(groupedReports);
        } catch (error) {
            console.error("Error fetching reports:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

router.put("/update", authenticateUser, authorizeRoles("patient"), tenantContext, async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { name, birth_date, gender, phoneNumbers, phones, email, address, nationality, passport_no, national_id } = req.body;
        const userId = req.user.id;

        // Update patient details
        await patient.update(
            { name, birth_date, gender, email, address, nationality, passport_no, national_id },
            {
                where: {
                    id: userId,
                    lab_id: req.tenant.lab_id
                },
                transaction
            }
        );

        // Handle phones
        const phonesList = phoneNumbers || phones;
        if (phonesList && phonesList.length > 0) {
            await phone_number.destroy({ where: { patient_id: userId }, transaction });
            const phoneRecords = phonesList.map((p, index) => ({
                patient_id: userId,
                phone: p.phone || p.phone_number,
                type: p.type || (index === 0 ? 'personal' : 'work'),
                is_primary: p.is_primary !== undefined ? p.is_primary : (index === 0)
            }));

            // Normalize phones
            const normalizedRecords = phoneRecords.map(r => ({
                ...r,
                phone: normalizePhone(r.phone)
            })).filter(r => r.phone !== null);

            if (normalizedRecords.length > 0) {
                await phone_number.bulkCreate(normalizedRecords, { transaction });
            }
        }

        // Fetch the updated patient with associated phones
        const updatedPatient = await patient.findByPk(userId, {
            where: { id: userId, lab_id: req.tenant.lab_id },
            include: [{ model: phone_number, as: 'phones' }],
            transaction
        });

        await transaction.commit();
        res.json({ success: true, updatedUser: updatedPatient });
    } catch (error) {
        await transaction.rollback();
        console.error("Error updating patient profile:", error);
        res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
    }
});

// get all patient's transactions in current lab
router.get("/transactions", authenticateUser, authorizeRoles("patient"),tenantContext, async (req, res) => {
    try {
        //const { patient_id, startDate, endDate, process_type } = req.query;
        
        // 1. Build Dynamic Filter Object
        let whereClause = {
            lab_id: req.tenant.lab_id, // Always restrict data to the current lab context
            patient_id: req.user.id
        };

        // 2. Query the Database
        const transactions = await financial_transaction.findAll({
            where: whereClause,
            include: [
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
                },
                {
                    model: branch,
                    as: 'branch',
                    attributes: ['name']
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
                branchName: txn.branchName ? txn.branchName.name : null,
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

// Get all patients
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "employee", "doctor"), tenantContext,
    // Use no-cache so browsers always revalidate after mutations (e.g. patient updates)
    (req, res, next) => {
        res.set({
            'Cache-Control': 'no-cache',
            'ETag': `"patients-${req.tenant?.lab_id || req.user.id}-${Date.now()}"`
        });
        next();
    },
    async (req, res) => {
        try {
            console.log('Fetching patients...');
            let whereClause = {};

            if (req.user.role === 'doctor') {
                // Fetch all labs associated with this doctor
                const contracts = await lab_contracts_doctor.findAll({
                    where: { doctor_id: req.user.id },
                    attributes: ['lab_id']
                });
                const labIds = contracts.map(c => c.lab_id);

                if (labIds.length === 0) {
                    return res.json([]);
                }
                whereClause.lab_id = { [sequelize.Sequelize.Op.in]: labIds };
            } else {
                whereClause.lab_id = req.tenant.lab_id;
            }

            const patients = await patient.findAll({
                where: whereClause,
                attributes: ['id', 'patientcode', 'name', 'birth_date', 'email', 'national_id', 'nationality', 'passport_no', 'gender', 'address', 'total', 'paid', 'due', 'contract_id', 'createdAt'],
                include: [
                    {
                        model: phone_number,
                        as: 'phones',
                        attributes: [['phone', 'phone_number'], 'type']
                    },
                    {
                        model: diseases,
                        as: 'diseases_id_diseases',
                        through: { attributes: [] },
                        attributes: ['id', 'name', 'details']
                    },
                    {
                        model: contract,
                        as: 'contract',
                        attributes: ['id', 'name'],
                        required: false
                    }
                ],
                order: [['name', 'ASC']]
            });
            console.log(`Found ${patients.length} patients`);
            res.json(patients);
        } catch (error) {
            console.error('Error fetching patients:', error);
            res.status(500).json({
                error: "Internal server error",
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

// Create new patient
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    try {
        const {
            name,
            email,
            gender,
            birth_date,
            national_id,
            nationality,
            passport_no,
            address,
            total,
            paid,
            due,
            contract_id,
            phoneNumbers = [], // New way: Array of { phone, type, is_primary }
            primaryPhone,   // Old way: Backward compatibility
            secondaryPhone, // Old way: Backward compatibility
            diseases = [] // Array of disease IDs
        } = req.body;

        // Generate unique patient code
        const patientcode = await generatePatientCode(req.tenant.lab_id);

        // Clean up empty strings to null
        const cleanNationalId = national_id && national_id.trim() !== '' ? national_id : null;
        const cleanPassportNo = passport_no && passport_no.trim() !== '' ? passport_no : null;
        const cleanNationality = nationality && nationality.trim() !== '' ? nationality : null;
        const cleanAddress = address && address.trim() !== '' ? address : null;

        // Check if national ID already exists (if provided) within the same lab
        if (cleanNationalId) {
            const existingNationalId = await patient.findOne({
                where: {
                    national_id: cleanNationalId,
                    lab_id: req.tenant.lab_id
                }
            });
            if (existingNationalId) {
                return res.status(400).json({ error: "National ID already exists" });
            }
        }

        // Check if passport number already exists (if provided) within the same lab
        if (cleanPassportNo) {
            const existingPassport = await patient.findOne({
                where: {
                    passport_no: cleanPassportNo,
                    lab_id: req.tenant.lab_id
                }
            });
            if (existingPassport) {
                return res.status(400).json({ error: "Passport number already exists" });
            }
        }

        // Create the patient
        const newPatient = await patient.create({
            name,
            patientcode,
            email: email || null,
            gender: gender || null,
            birth_date: birth_date || null,
            national_id: cleanNationalId,
            nationality: cleanNationality,
            passport_no: cleanPassportNo,
            address: cleanAddress,
            total: total || 0.00,
            paid: paid || 0.00,
            due: due || 0.00,
            contract_id: contract_id || null,
            lab_id: req.tenant.lab_id
        });

        // Add phone numbers
        const phonesToCreate = [];

        // Handle new format
        if (phoneNumbers && phoneNumbers.length > 0) {
            phoneNumbers.forEach(p => {
                const normalized = normalizePhone(p.phone);
                if (normalized) {
                    phonesToCreate.push({
                        phone: normalized,
                        type: p.type || 'personal',
                        is_primary: p.is_primary || false,
                        patient_id: newPatient.id
                    });
                }
            });
        } else {
            // Handle old format
            if (primaryPhone) {
                const normalized = normalizePhone(primaryPhone);
                if (normalized) {
                    phonesToCreate.push({
                        phone: normalized,
                        type: 'personal',
                        is_primary: true,
                        patient_id: newPatient.id
                    });
                }
            }
            if (secondaryPhone) {
                const normalized = normalizePhone(secondaryPhone);
                if (normalized) {
                    phonesToCreate.push({
                        phone: normalized,
                        type: 'work',
                        is_primary: false,
                        patient_id: newPatient.id
                    });
                }
            }
        }

        if (phonesToCreate.length > 0) {
            // Ensure only one is primary if multiple are provided
            const primaryCount = phonesToCreate.filter(p => p.is_primary).length;
            if (primaryCount === 0) {
                phonesToCreate[0].is_primary = true;
            } else if (primaryCount > 1) {
                // If multiple primary, keep only the first one as primary
                let foundPrimary = false;
                phonesToCreate.forEach(p => {
                    if (p.is_primary) {
                        if (foundPrimary) p.is_primary = false;
                        else foundPrimary = true;
                    }
                });
            }
            await phone_number.bulkCreate(phonesToCreate);
        }

        // Add diseases if provided
        if (diseases.length > 0) {
            const diseaseRecords = diseases.map(diseaseId => ({
                patient_id: newPatient.id,
                diseases_id: diseaseId
            }));
            await patient_has_diseases.bulkCreate(diseaseRecords);
        }

        // Fetch the created patient with phone numbers and diseases
        const createdPatient = await patient.findByPk(newPatient.id, {
            include: [
                {
                    model: phone_number,
                    as: 'phones'
                },
                {
                    model: db.diseases,
                    as: 'diseases_id_diseases',
                    through: { attributes: [] }
                },
                {
                    model: contract,
                    as: 'contract',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.status(201).json(createdPatient);
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// Update patient (uses a transaction to ensure all changes are atomic)
router.put("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const patientId = req.params.id;
        const {
            name,
            email,
            gender,
            birth_date,
            national_id,
            nationality,
            passport_no,
            address,
            phoneNumbers = [], // Array of { phone, type, is_primary }
            primaryPhone,
            secondaryPhone,
            diseases = [] // Array of disease IDs
        } = req.body;

        // Check if patient exists and belongs to the current lab
        const existingPatient = await patient.findOne({
            where: {
                id: patientId,
                lab_id: req.tenant.lab_id
            },
            transaction
        });

        if (!existingPatient) {
            await transaction.rollback();
            return res.status(404).json({ error: "Patient not found" });
        }

        // Clean up empty strings to null
        const cleanNationalId = national_id && national_id.trim() !== '' ? national_id : null;
        const cleanPassportNo = passport_no && passport_no.trim() !== '' ? passport_no : null;
        const cleanNationality = nationality && nationality.trim() !== '' ? nationality : null;
        const cleanAddress = address && address.trim() !== '' ? address : null;

        // Check if national ID already exists (if changed and provided) within the same lab
        if (cleanNationalId && cleanNationalId !== existingPatient.national_id) {
            const existingNationalId = await patient.findOne({
                where: { national_id: cleanNationalId, lab_id: req.tenant.lab_id },
                transaction
            });
            if (existingNationalId) {
                await transaction.rollback();
                return res.status(400).json({ error: "National ID already exists" });
            }
        }

        // Check if passport number already exists (if changed and provided) within the same lab
        if (cleanPassportNo && cleanPassportNo !== existingPatient.passport_no) {
            const existingPassport = await patient.findOne({
                where: { passport_no: cleanPassportNo, lab_id: req.tenant.lab_id },
                transaction
            });
            if (existingPassport) {
                await transaction.rollback();
                return res.status(400).json({ error: "Passport number already exists" });
            }
        }

        // Update the patient record
        await patient.update({
            name,
            email: email || null,
            gender: gender || null,
            birth_date: birth_date || null,
            national_id: cleanNationalId,
            nationality: cleanNationality,
            passport_no: cleanPassportNo,
            address: cleanAddress,
            total: req.body.total !== undefined ? req.body.total : existingPatient.total,
            paid: req.body.paid !== undefined ? req.body.paid : existingPatient.paid,
            due: req.body.due !== undefined ? req.body.due : existingPatient.due,
            contract_id: req.body.contract_id !== undefined ? req.body.contract_id : existingPatient.contract_id,
        }, { where: { id: patientId } });

        // Update phone numbers
        if (phoneNumbers !== undefined || primaryPhone !== undefined || secondaryPhone !== undefined) {
            // Delete existing phone numbers
            await phone_number.destroy({ where: { patient_id: patientId } });

            const phonesToCreate = [];
            if (phoneNumbers && phoneNumbers.length > 0) {
                phoneNumbers.forEach(p => {
                    const normalized = normalizePhone(p.phone);
                    if (normalized) {
                        phonesToCreate.push({
                            phone: normalized,
                            type: p.type || 'personal',
                            is_primary: p.is_primary || false,
                            patient_id: patientId
                        });
                    }
                });
            } else {
                // Backward compatibility
                if (primaryPhone) {
                    const normalized = normalizePhone(primaryPhone);
                    if (normalized) {
                        phonesToCreate.push({
                            phone: normalized,
                            type: 'personal',
                            is_primary: true,
                            patient_id: patientId
                        });
                    }
                }
                if (secondaryPhone) {
                    const normalized = normalizePhone(secondaryPhone);
                    if (normalized) {
                        phonesToCreate.push({
                            phone: normalized,
                            type: 'work',
                            is_primary: false,
                            patient_id: patientId
                        });
                    }
                }
            }

            if (phonesToCreate.length > 0) {
                // Ensure only one is primary
                const primaryCount = phonesToCreate.filter(p => p.is_primary).length;
                if (primaryCount === 0) {
                    phonesToCreate[0].is_primary = true;
                } else if (primaryCount > 1) {
                    let foundPrimary = false;
                    phonesToCreate.forEach(p => {
                        if (p.is_primary) {
                            if (foundPrimary) p.is_primary = false;
                            else foundPrimary = true;
                        }
                    });
                }
                await phone_number.bulkCreate(phonesToCreate);
            }
        }

        // Update diseases
        await patient_has_diseases.destroy({ where: { patient_id: patientId }, transaction });
        if (diseases.length > 0) {
            const diseaseRecords = diseases.map(diseaseId => ({
                patient_id: patientId,
                diseases_id: diseaseId
            }));
            await patient_has_diseases.bulkCreate(diseaseRecords, { transaction });
        }

        await transaction.commit();

        // Fetch the updated patient with phone numbers and diseases (after commit)
        const updatedPatient = await patient.findByPk(patientId, {
            include: [
                {
                    model: phone_number,
                    as: 'phones'
                },
                {
                    model: db.diseases,
                    as: 'diseases_id_diseases',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'details']
                },
                {
                    model: contract,
                    as: 'contract',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json(updatedPatient);
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating patient:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// Delete patient
router.delete("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    try {
        const patientId = req.params.id;

        // Check if patient exists and belongs to the current lab
        const existingPatient = await patient.findOne({
            where: {
                id: patientId,
                lab_id: req.tenant.lab_id
            }
        });

        if (!existingPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Check if patient has any related records (bills, medical reports, etc.)
        const hasBills = await bill.findOne({ where: { patient_id: patientId } });
        if (hasBills) {
            return res.status(400).json({ error: "Cannot delete patient with associated bills" });
        }

        const hasMedicalReports = await medical_report.findOne({ where: { patient_id: patientId } });
        if (hasMedicalReports) {
            return res.status(400).json({ error: "Cannot delete patient with existing medical reports" });
        }

        // Delete phone numbers first
        await phone_number.destroy({ where: { patient_id: patientId } });

        // Delete patient
        await patient.destroy({ where: { id: patientId } });

        res.json({ message: "Patient deleted successfully" });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// Get all available diseases
router.get("/diseases", authenticateUser, authorizeRoles("admin", "receptionist", "doctor"),
    // Add cache headers for 1 hour - diseases rarely change
    (req, res, next) => {
        res.set({
            'Cache-Control': 'public, max-age=3600', // 1 hour
        });
        next();
    },
    async (req, res) => {
        try {
            const diseasesList = await diseases.findAll({
                attributes: ['id', 'name', 'details'],
                order: [['name', 'ASC']]
            });
            res.json(diseasesList);
        } catch (error) {
            console.error('Error fetching diseases:', error);
            res.status(500).json({
                error: "Internal server error",
                message: error.message
            });
        }
    });

// Import patients from Excel/CSV
router.post("/import", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Validate file
        const validation = validateExcelBuffer(req.file.buffer);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        // Read Excel data
        const data = await readExcelBuffer(req.file.buffer);

        if (!data || data.length === 0) {
            return res.status(400).json({ error: "No data found in the uploaded file" });
        }

        let imported = 0;
        let errors = [];

        for (let i = 0; i < data.length; i++) {
            try {
                const row = data[i];

                // Validate required fields - only Name and Primary Phone are required
                if (!row.Name || !row['Primary Phone']) {
                    errors.push(`Row ${i + 2}: Missing required fields (Name and Primary Phone are required)`);
                    continue;
                }

                // Check if patient already exists by phone number within the current lab
                const existingPhone = await phone_number.findOne({
                    where: {
                        phone: row['Primary Phone'].toString()
                    },
                    include: [{
                        model: patient,
                        as: 'patient',
                        where: { lab_id: req.tenant.lab_id },
                        required: true
                    }]
                });

                if (existingPhone) {
                    errors.push(`Row ${i + 2}: Patient with phone number ${row['Primary Phone']} already exists`);
                    continue;
                }

                // Generate patient code
                const patientcode = await generatePatientCode(req.tenant.lab_id);

                // Parse birth date if provided
                let birthDate = null;
                if (row['Birth Date']) {
                    const date = new Date(row['Birth Date']);
                    if (!isNaN(date.getTime())) {
                        birthDate = date.toISOString().split('T')[0];
                    }
                }

                // Handle contract if provided
                let contractId = null;
                if (row.Contract) {
                    const contractParts = row.Contract.split(' - ');
                    if (contractParts.length === 2) {
                        const [region, governorate] = contractParts;
                        const existingContract = await contract.findOne({
                            where: { region: region.trim(), governorate: governorate.trim() }
                        });
                        if (existingContract) {
                            contractId = existingContract.id;
                        }
                    }
                }

                // Create patient with minimal required data
                const newPatient = await patient.create({
                    name: row.Name,
                    patientcode,
                    email: row.Email || null,
                    gender: row.Gender ? (row.Gender.toLowerCase() === 'male' ? 'm' : 'f') : null,
                    birth_date: birthDate,
                    national_id: row['National ID'] || null,
                    nationality: row.Nationality || null,
                    passport_no: row['Passport No'] || null,
                    address: row.Address || null,
                    total: row.Total ? parseFloat(row.Total) : null,
                    paid: row.Paid ? parseFloat(row.Paid) : null,
                    due: row.Due ? parseFloat(row.Due) : null,
                    contract_id: contractId
                });

                // Add primary phone number
                await phone_number.create({
                    phone: row['Primary Phone'].toString(),
                    type: 'personal',
                    is_primary: true,
                    patient_id: newPatient.id
                });

                // Add secondary phone if provided
                if (row['Secondary Phone']) {
                    await phone_number.create({
                        phone: row['Secondary Phone'].toString(),
                        type: 'secondary',
                        patient_id: newPatient.id
                    });
                }

                // Add diseases if provided
                if (row.Diseases) {
                    const diseaseNames = row.Diseases.split(',').map(d => d.trim());
                    for (const diseaseName of diseaseNames) {
                        const disease = await diseases.findOne({
                            where: { name: diseaseName }
                        });
                        if (disease) {
                            await patient_has_diseases.create({
                                patient_id: newPatient.id,
                                diseases_id: disease.id
                            });
                        }
                    }
                }

                imported++;
            } catch (error) {
                errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }

        res.json({
            imported,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully imported ${imported} patients${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
        });
    } catch (error) {
        console.error('Error importing patients:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// Bulk delete patients
router.delete("/bulk", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    try {
        const { patientIds } = req.body;

        if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
            return res.status(400).json({ error: "Patient IDs array is required" });
        }

        let deleted = 0;
        let errors = [];

        for (const patientId of patientIds) {
            try {
                // Check if patient exists and belongs to the current lab
                const existingPatient = await patient.findOne({
                    where: {
                        id: patientId,
                        lab_id: req.tenant.lab_id
                    }
                });

                if (!existingPatient) {
                    errors.push(`Patient ID ${patientId}: Patient not found`);
                    continue;
                }

                // Check if patient has any related records
                const hasBills = await bill.findOne({ where: { patient_id: patientId } });
                if (hasBills) {
                    errors.push(`Patient ID ${patientId}: Cannot delete patient with existing bills`);
                    continue;
                }

                const hasMedicalReports = await medical_report.findOne({ where: { patient_id: patientId } });
                if (hasMedicalReports) {
                    errors.push(`Patient ID ${patientId}: Cannot delete patient with existing medical reports`);
                    continue;
                }

                // Delete phone numbers first
                await phone_number.destroy({ where: { patient_id: patientId } });

                // Delete patient
                await patient.destroy({ where: { id: patientId } });

                deleted++;
            } catch (error) {
                errors.push(`Patient ID ${patientId}: ${error.message}`);
            }
        }

        res.json({
            deleted,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully deleted ${deleted} patients${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
        });
    } catch (error) {
        console.error('Error bulk deleting patients:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// Bulk update patients
router.put("/bulk", authenticateUser, authorizeRoles("admin", "receptionist"), tenantContext, async (req, res) => {
    try {
        const { patientIds, updateData } = req.body;

        if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
            return res.status(400).json({ error: "Patient IDs array is required" });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "Update data is required" });
        }

        let updated = 0;
        let errors = [];

        for (const patientId of patientIds) {
            try {
                // Check if patient exists and belongs to the current lab
                const existingPatient = await patient.findOne({
                    where: {
                        id: patientId,
                        lab_id: req.tenant.lab_id
                    }
                });

                if (!existingPatient) {
                    errors.push(`Patient ID ${patientId}: Patient not found`);
                    continue;
                }

                // Prepare update object
                const updateObject = {};
                if (updateData.nationality !== undefined) {
                    updateObject.nationality = updateData.nationality;
                }

                // Update patient if there are fields to update
                if (Object.keys(updateObject).length > 0) {
                    await patient.update(updateObject, { where: { id: patientId } });
                }

                // Update diseases if provided
                if (updateData.diseases && Array.isArray(updateData.diseases)) {
                    await patient_has_diseases.destroy({ where: { patient_id: patientId } });

                    if (updateData.diseases.length > 0) {
                        const diseaseRecords = updateData.diseases.map(diseaseId => ({
                            patient_id: patientId,
                            diseases_id: diseaseId
                        }));
                        await patient_has_diseases.bulkCreate(diseaseRecords);
                    }
                }

                updated++;
            } catch (error) {
                errors.push(`Patient ID ${patientId}: ${error.message}`);
            }
        }

        res.json({
            updated,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully updated ${updated} patients${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
        });
    } catch (error) {
        console.error('Error bulk updating patients:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// GET /patient/reports/:id - get full report for authenticated patient
router.get('/reports/:id', authenticateUser, authorizeRoles('patient'), tenantContext, async (req, res) => {
    try {
        const reportId = req.params.id;
        const patientId = req.user.id;
        const lab_id = req.tenant.lab_id;
        const report = await db.medical_report.findOne({
            where: { id: reportId, patient_id: patientId, lab_id: lab_id },
            include: [
                {
                    model: db.patient,
                    as: 'patient',
                    attributes: ['id', 'name', 'birth_date', 'gender', 'patientcode']
                },
                {
                    model: db.test,
                    as: 'test_id_test_medical_report_has_tests',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'structure_config', 'type']
                },
                {
                    model: db.medical_report_has_test,
                    as: 'medical_report_has_tests'
                }
            ]
        });
        if (!report) {
            return res.status(404).json({ error: 'Report not found or access denied.' });
        }
        res.json(report);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get patient count
router.get('/count', authenticateUser, authorizeRoles('admin'), tenantContext,
    // Add cache headers for 1 minute
    (req, res, next) => {
        res.set({
            'Cache-Control': 'public, max-age=60', // 1 minute
        });
        next();
    },
    async (req, res) => {
        try {
            const count = await patient.count({
                where: {
                    lab_id: req.tenant.lab_id
                }
            });
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get patient count' });
        }
    });

// Get recent patients
router.get('/recent', authenticateUser, authorizeRoles('admin'), tenantContext,
    // Add cache headers for 2 minutes
    (req, res, next) => {
        res.set({
            'Cache-Control': 'public, max-age=120', // 2 minutes
        });
        next();
    },
    async (req, res) => {
        try {
            const patients = await patient.findAll({
                where: {
                    lab_id: req.tenant.lab_id
                },
                order: [['id', 'DESC']],
                limit: 5,
                attributes: ['id', 'name', 'birth_date']
            });
            res.json(patients);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get recent patients' });
        }
    });

// Get a single patient by ID
// IMPORTANT: This parameterized route must come AFTER all literal-path GET routes
// (e.g. /diseases, /count, /recent) to avoid shadowing them.
router.get("/:id", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "employee", "doctor"), tenantContext, async (req, res) => {
    try {
        const patientId = req.params.id;
        let whereClause = { id: patientId };

        // Scope to the user's lab (doctors may access multiple labs)
        if (req.user.role === 'doctor') {
            const contracts = await lab_contracts_doctor.findAll({
                where: { doctor_id: req.user.id },
                attributes: ['lab_id']
            });
            const labIds = contracts.map(c => c.lab_id);
            if (labIds.length === 0) {
                return res.status(404).json({ error: "Patient not found" });
            }
            whereClause.lab_id = { [sequelize.Sequelize.Op.in]: labIds };
        } else {
            whereClause.lab_id = req.tenant.lab_id;
        }

        const foundPatient = await patient.findOne({
            where: whereClause,
            include: [
                {
                    model: phone_number,
                    as: 'phones',
                    attributes: [['phone', 'phone_number'], 'type', 'is_primary']
                },
                {
                    model: diseases,
                    as: 'diseases_id_diseases',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'details']
                },
                {
                    model: contract,
                    as: 'contract',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        if (!foundPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        res.json(foundPatient);
    } catch (error) {
        console.error('Error fetching patient by ID:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

module.exports = router;
