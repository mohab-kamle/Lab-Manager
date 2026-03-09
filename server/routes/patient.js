const express = require("express");
const router = express.Router();
const { medical_report, patient, admin, chemist, phone, diseases, patient_has_diseases } = require("../models");
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
const rateLimit = require('express-rate-limit');

// Rate limiter for login to mitigate brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // limit each IP to 10 requests per windowMs
  standardHeaders: true,    // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." }
});

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

router.post("/login", loginLimiter, async (req, res) => {
  const { patientcode} = req.body;

    try {
        const Patient = await patient.findOne({
            where: {
                patientcode
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
        phones = await phone.findAll({ where: { patient_id: Patient.id } });
        user = { ...Patient.get(), role: "patient", phones };
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
    mrht.result,
    tc.unit,
    tc.normal_from,
    tc.normal_to
    FROM
    medical_report mr
    LEFT JOIN patient p ON p.id = mr.patient_id
    LEFT JOIN chemist c ON c.id = mr.signatory_id
    LEFT JOIN admin a ON a.id = mr.signatory_admin_id
    LEFT JOIN medical_report_has_test mrht ON mrht.medical_report_id = mr.id
    INNER JOIN test t ON mrht.test_id = t.id
    LEFT JOIN test_component tc 
        ON tc.test_id = t.id 
        AND TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) BETWEEN tc.age_start AND tc.age_end
        AND (tc.gender = p.gender OR tc.gender IS NULL) -- Handling cases where gender might not be required
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
                    unit: row.unit,
                    normal_from: row.normal_from,
                    normal_to: row.normal_to,
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
        const { name, birth_date, gender, phones, email, address, nationality, passport_no, national_id } = req.body;
        console.log("Received phones array:", phones);
        const userId = req.user.id; // Assuming user ID is stored in the auth token

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
        if (phones && phones.length > 0) {
            console.log("Attempting to destroy existing phone numbers for patient:", userId);
            await db.phone.destroy({ where: { patient_id: userId }, transaction });
            console.log("Existing phone numbers destroyed for patient:", userId);
            const phoneRecords = phones.map((p, index) => ({
                patient_id: userId,
                phone_number: p.phone_number,
                type: index === 0 ? 'primary' : 'secondary' // Assuming the first phone is primary, second is secondary
            }));
            console.log("Attempting to bulk create new phone numbers:", phoneRecords);
            await db.phone.bulkCreate(phoneRecords, { transaction });
            console.log("New phone numbers bulk created for patient:", userId);
        }

        // Fetch the updated patient with associated phones
        const updatedPatient = await patient.findByPk(userId, {
            include: [{ model: db.phone, as: 'phones' }],
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

// Get all patients
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "employee"), tenantContext,
    // Add cache headers for 5 minutes
    (req, res, next) => {
        res.set({
            'Cache-Control': 'public, max-age=300', // 5 minutes
            'ETag': `"patients-${req.tenant.lab_id}-${Date.now()}"`
        });
        next();
    },
    async (req, res) => {
        try {
            console.log('Fetching patients...');
            const patients = await patient.findAll({
                where: {
                    lab_id: req.tenant.lab_id
                },
                attributes: ['id', 'patientcode', 'name', 'birth_date', 'email', 'national_id', 'nationality', 'passport_no', 'gender', 'address', 'total', 'paid', 'due', 'contract_id', 'referral_id', 'createdAt'],
                include: [
                    {
                        model: phone,
                        as: 'phones',
                        attributes: ['phone_number', 'type']
                    },
                    {
                        model: sequelize.models.diseases,
                        as: 'diseases_id_diseases',
                        through: { attributes: [] },
                        attributes: ['id', 'name', 'details']
                    },
                    {
                        model: sequelize.models.contract,
                        as: 'contract',
                        attributes: ['id', 'name'],
                        required: false
                    },
                    {
                        model: sequelize.models.referral,
                        as: 'referral',
                        attributes: ['id', 'doctor_name', 'specialization', 'phone', 'email'],
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
            primaryPhone,
            secondaryPhone,
            total,
            paid,
            due,
            contract_id,
            referral_id,
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
            referral_id: referral_id || null,
            lab_id: req.tenant.lab_id
        });

        // Add phone numbers if provided
        if (primaryPhone) {
            await phone.create({
                phone_number: primaryPhone,
                type: 'primary',
                patient_id: newPatient.id
            });
        }

        if (secondaryPhone) {
            await phone.create({
                phone_number: secondaryPhone,
                type: 'secondary',
                patient_id: newPatient.id
            });
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
                    model: phone,
                    as: 'phones'
                },
                {
                    model: sequelize.models.diseases,
                    as: 'diseases_id_diseases',
                    through: { attributes: [] }
                },
                {
                    model: sequelize.models.contract,
                    as: 'contract',
                    attributes: ['id', 'name']
                },
                {
                    model: sequelize.models.referral,
                    as: 'referral',
                    attributes: ['id', 'doctor_name', 'specialization', 'phone', 'email']
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

// Update patient
router.put("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), async (req, res) => {
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
            primaryPhone,
            secondaryPhone,
            total,
            paid,
            due,
            contract_id,
            referral_id,
            diseases = [] // Array of disease IDs
        } = req.body;

        // Check if patient exists
        const existingPatient = await patient.findByPk(patientId);
        if (!existingPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Clean up empty strings to null
        const cleanNationalId = national_id && national_id.trim() !== '' ? national_id : null;
        const cleanPassportNo = passport_no && passport_no.trim() !== '' ? passport_no : null;
        const cleanNationality = nationality && nationality.trim() !== '' ? nationality : null;
        const cleanAddress = address && address.trim() !== '' ? address : null;

        // Check if national ID already exists (if changed and provided)
        if (cleanNationalId && cleanNationalId !== existingPatient.national_id) {
            const existingNationalId = await patient.findOne({ where: { national_id: cleanNationalId } });
            if (existingNationalId) {
                return res.status(400).json({ error: "National ID already exists" });
            }
        }

        // Check if passport number already exists (if changed and provided)
        if (cleanPassportNo && cleanPassportNo !== existingPatient.passport_no) {
            const existingPassport = await patient.findOne({ where: { passport_no: cleanPassportNo } });
            if (existingPassport) {
                return res.status(400).json({ error: "Passport number already exists" });
            }
        }

        // Update the patient
        await patient.update({
            name,
            email: email || null,
            gender: gender || null,
            birth_date: birth_date || null,
            national_id: cleanNationalId,
            nationality: cleanNationality,
            passport_no: cleanPassportNo,
            address: cleanAddress,
            total: total !== undefined ? total : existingPatient.total,
            paid: paid !== undefined ? paid : existingPatient.paid,
            due: due !== undefined ? due : existingPatient.due,
            contract_id: contract_id !== undefined ? contract_id : existingPatient.contract_id,
            referral_id: referral_id !== undefined ? referral_id : existingPatient.referral_id
        }, { where: { id: patientId } });

        // Update phone numbers
        if (primaryPhone !== undefined) {
            await phone.destroy({ where: { patient_id: patientId, type: 'primary' } });
            if (primaryPhone) {
                await phone.create({
                    phone_number: primaryPhone,
                    type: 'primary',
                    patient_id: patientId
                });
            }
        }

        if (secondaryPhone !== undefined) {
            await phone.destroy({ where: { patient_id: patientId, type: 'secondary' } });
            if (secondaryPhone) {
                await phone.create({
                    phone_number: secondaryPhone,
                    type: 'secondary',
                    patient_id: patientId
                });
            }
        }

        // Update diseases
        await patient_has_diseases.destroy({ where: { patient_id: patientId } });
        if (diseases.length > 0) {
            const diseaseRecords = diseases.map(diseaseId => ({
                patient_id: patientId,
                diseases_id: diseaseId
            }));
            await patient_has_diseases.bulkCreate(diseaseRecords);
        }

        // Fetch the updated patient with phone numbers and diseases
        const updatedPatient = await patient.findByPk(patientId, {
            include: [
                {
                    model: phone,
                    as: 'phones'
                },
                {
                    model: sequelize.models.diseases,
                    as: 'diseases_id_diseases',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'details']
                },
                {
                    model: sequelize.models.contract,
                    as: 'contract',
                    attributes: ['id', 'name']
                },
                {
                    model: sequelize.models.referral,
                    as: 'referral',
                    attributes: ['id', 'doctor_name', 'specialization', 'phone', 'email']
                }
            ]
        });

        res.json(updatedPatient);
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// Delete patient
router.delete("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), async (req, res) => {
    try {
        const patientId = req.params.id;

        // Check if patient exists
        const existingPatient = await patient.findByPk(patientId);
        if (!existingPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Check if patient has any related records (bills, medical reports, etc.)
        const hasBills = await sequelize.models.bill.findOne({ where: { patient_id: patientId } });
        if (hasBills) {
            return res.status(400).json({ error: "Cannot delete patient with existing bills" });
        }

        const hasMedicalReports = await sequelize.models.medical_report.findOne({ where: { patient_id: patientId } });
        if (hasMedicalReports) {
            return res.status(400).json({ error: "Cannot delete patient with existing medical reports" });
        }

        // Delete phone numbers first
        await phone.destroy({ where: { patient_id: patientId } });

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
router.get("/diseases", authenticateUser, authorizeRoles("admin", "receptionist"),
    // Add cache headers for 1 hour - diseases rarely change
    (req, res, next) => {
        res.set({
            'Cache-Control': 'public, max-age=3600', // 1 hour
        });
        next();
    },
    async (req, res) => {
        try {
            const diseasesList = await sequelize.models.diseases.findAll({
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
router.post("/import", authenticateUser, authorizeRoles("admin", "receptionist"), upload.single('file'), async (req, res) => {
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

                // Check if patient already exists by phone number
                const existingPhone = await phone.findOne({
                    where: {
                        phone_number: row['Primary Phone'].toString()
                    }
                });

                if (existingPhone) {
                    errors.push(`Row ${i + 2}: Patient with phone number ${row['Primary Phone']} already exists`);
                    continue;
                }

                // Generate patient code
                const patientcode = await generatePatientCode();

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
                        const existingContract = await sequelize.models.contract.findOne({
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
                await phone.create({
                    phone_number: row['Primary Phone'].toString(),
                    type: 'primary',
                    patient_id: newPatient.id
                });

                // Add secondary phone if provided
                if (row['Secondary Phone']) {
                    await phone.create({
                        phone_number: row['Secondary Phone'].toString(),
                        type: 'secondary',
                        patient_id: newPatient.id
                    });
                }

                // Add diseases if provided
                if (row.Diseases) {
                    const diseaseNames = row.Diseases.split(',').map(d => d.trim());
                    for (const diseaseName of diseaseNames) {
                        const disease = await sequelize.models.diseases.findOne({
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
router.delete("/bulk", authenticateUser, authorizeRoles("admin", "receptionist"), async (req, res) => {
    try {
        const { patientIds } = req.body;

        if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
            return res.status(400).json({ error: "Patient IDs array is required" });
        }

        let deleted = 0;
        let errors = [];

        for (const patientId of patientIds) {
            try {
                // Check if patient exists
                const existingPatient = await patient.findByPk(patientId);
                if (!existingPatient) {
                    errors.push(`Patient ID ${patientId}: Patient not found`);
                    continue;
                }

                // Check if patient has any related records
                const hasBills = await sequelize.models.bill.findOne({ where: { patient_id: patientId } });
                if (hasBills) {
                    errors.push(`Patient ID ${patientId}: Cannot delete patient with existing bills`);
                    continue;
                }

                const hasMedicalReports = await sequelize.models.medical_report.findOne({ where: { patient_id: patientId } });
                if (hasMedicalReports) {
                    errors.push(`Patient ID ${patientId}: Cannot delete patient with existing medical reports`);
                    continue;
                }

                // Delete phone numbers first
                await phone.destroy({ where: { patient_id: patientId } });

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
router.put("/bulk", authenticateUser, authorizeRoles("admin", "receptionist"), async (req, res) => {
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
                // Check if patient exists
                const existingPatient = await patient.findByPk(patientId);
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
router.get('/reports/:id', authenticateUser, authorizeRoles('patient'), async (req, res) => {
    try {
        const reportId = req.params.id;
        const patientId = req.user.id;
        const report = await db.medical_report.findOne({
            where: { id: reportId, patient_id: patientId },
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
                    include: [
                        { model: db.test_component, as: 'components', attributes: ['id', 'name', 'unit', 'normal_from', 'normal_to', 'gender', 'age_start', 'age_end', 'test_id'] }
                    ]
                },
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { attributes: [] }
                },
                {
                    model: db.medical_report_has_test,
                    as: 'medical_report_has_tests'
                },
                {
                    model: db.medical_report_has_culture,
                    as: 'medical_report_has_cultures'
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

module.exports = router;
