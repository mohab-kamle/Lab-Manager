const express = require("express");
const router = express.Router();
const db = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const { cacheMedicalReportNewResultsData, cacheMedicalReportsList, invalidateTestResultsCache, invalidateMedicalReportCache, invalidateListCache } = require("../middleware/cacheMiddleware");
const { Op, where } = require("sequelize");
const multer = require("multer");
const path = require("path");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel and CSV files are allowed"), false);
    }
  },
});

// Multer configuration for secure image uploads
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use secure comment-images directory
    const baseUploadPath = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../uploads');
    const uploadPath = path.join(baseUploadPath, 'comment-images');

    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate secure filename with report ID for authorization
    // Format: reportId_commentType_timestamp_originalName

    // Sanitize input to prevent path traversal
    const sanitizeFilenamePart = (part) => {
      if (!part) return '';
      return String(part).replace(/[^a-zA-Z0-9_-]/g, '');
    };

    const rawReportId = req.params.id || req.body.reportId || 'unknown';
    const rawCommentType = req.body.commentType || 'general';

    const reportId = sanitizeFilenamePart(rawReportId);
    const commentType = sanitizeFilenamePart(rawCommentType);

    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

    const secureFilename = `${reportId}_${commentType}_${timestamp}_${randomSuffix}_${sanitizedOriginalName}`;
    cb(null, secureFilename);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
    files: 3 // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});
const {
  readExcelBuffer,
  validateExcelBuffer,
  sanitizeDataForExport,
} = require("../services/excelService");
const fs = require("fs");

// Helper function to update medical report dates based on workflow stage
async function updateMedicalReportDates(
  medicalReportId,
  stage,
  transaction = null
) {
  try {
    const updateData = {};
    const now = new Date();

    switch (stage) {
      case "registered":
        updateData.registered_at = now;
        break;
      case "collected":
        updateData.collected_at = now;
        break;
      case "received":
        updateData.received_at = now;
        break;
      case "reported":
        updateData.reported_at = now;
        break;
      default:
        console.warn(`Unknown stage: ${stage}`);
        return;
    }

    await db.medical_report.update(updateData, {
      where: { id: medicalReportId },
      transaction: transaction,
    });

    console.log(
      `Updated medical report ${medicalReportId} with ${stage} date:`,
      now
    );
  } catch (error) {
    console.error(
      `Error updating medical report dates for stage ${stage}:`,
      error
    );
    throw error;
  }
}

// Get all medical reports
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist", "employee", "doctor"),
  tenantContext,
  cacheMedicalReportsList, // Redis cache middleware for performance optimization
  async (req, res) => {
    try {
      // Safety check for tenant context
      // For doctors, tenant context might not have lab_id, which is expected
      if (!req.tenant && req.user.role !== 'doctor') {
        console.error('❌ Critical Error: req.tenant is undefined in medical_reports route');
        console.log('Headers:', req.headers);
        console.log('User:', req.user);
        return res.status(500).json({ error: "Internal Server Error: Tenant context missing" });
      }

      let whereClause = {};

      if (req.user.role === 'doctor') {
        // Fetch all labs associated with this doctor
        const contracts = await db.lab_contracts_doctor.findAll({
          where: { doctor_id: req.user.id },
          attributes: ['lab_id']
        });
        const labIds = contracts.map(c => c.lab_id);

        if (labIds.length === 0) {
          return res.json([]); // No contracts, no reports
        }
        whereClause.lab_id = { [Op.in]: labIds };
      } else {
        if (!req.tenant.lab_id) {
          return res.status(500).json({ error: "Tenant context missing lab_id" });
        }
        whereClause.lab_id = req.tenant.lab_id;
      }

      // Get medical_report_ids for the filtered labs
      const medicalReportIds = await db.medical_report
        .findAll({
          attributes: ["id"],
          where: whereClause,
          raw: true,
        })
        .then((reports) => reports.map((report) => report.id));

      // Note: Test and culture counts are now calculated from the actual associations
      // instead of separate count queries for better accuracy and performance

      // First fetch reports filtered by lab_id
      const reports = await db.medical_report.findAll({
        where: whereClause,
        include: [
          {
            model: db.patient,
            as: "patient",
            attributes: ["id", "name", "patientcode", "birth_date", "gender"],
            include: [
              {
                model: db.referral,
                as: "referral",
                attributes: [
                  "id",
                  "doctor_name",
                  "specialization",
                  "phone",
                  "email",
                ],
              },
            ],
          },
          {
            model: db.test,
            as: "tests",
            through: { attributes: [] },
            attributes: ["id", "name"],
          },
          {
            model: db.bill,
            as: "bill",
            attributes: ["id", "date"],
          },
          {
            model: db.admin,
            as: "signatory_admin",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: db.chemist,
            as: "signatory",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      // Collect report IDs for fetching related tests and cultures
      const medicalReportIds = reports.map(r => r.id);

      // Fetch tests and cultures in parallel using the collected report IDs
      const [tests, cultures] = await Promise.all([
        // Fetch tests for these reports
        medicalReportIds.length > 0 ? db.medical_report_has_test.findAll({
          where: {
            medical_report_id: {
              [Op.in]: medicalReportIds
            }
          },
          include: [{
            model: db.test,
            as: 'test',
            attributes: ['id', 'name']
          }]
        }) : [],
        // Fetch cultures for these reports
        medicalReportIds.length > 0 ? db.medical_report_has_culture.findAll({
          where: {
            medical_report_id: {
              [Op.in]: medicalReportIds
            }
          },
          include: [{
            model: db.culture,
            as: 'culture',
            attributes: ['id', 'name']
          }]
        }) : []
      ]);

      // Group tests and cultures by medical_report_id
      const testsMap = {};
      const culturesMap = {};

      if (tests) {
        tests.forEach(item => {
          if (!testsMap[item.medical_report_id]) testsMap[item.medical_report_id] = [];
          if (item.test) { // Ensure test object exists
            testsMap[item.medical_report_id].push({
              id: item.test.id,
              name: item.test.name
            });
          }
        });
      }

      if (cultures) {
        cultures.forEach(item => {
          if (!culturesMap[item.medical_report_id]) culturesMap[item.medical_report_id] = [];
          if (item.culture) {
            culturesMap[item.medical_report_id].push({
              id: item.culture.id,
              name: item.culture.name
            });
          }
        });
      }

      // Add patient_name, counts, and test group counts to each report for easier access
      const reportsWithPatientName = reports.map((report) => {
        const reportData = report.get({ plain: true });
        const reportTests = testsMap[reportData.id] || [];
        const reportCultures = culturesMap[reportData.id] || [];

        return {
          ...reportData,
          patient_name: reportData.patient?.name || "Unknown Patient",
          tests: reportData.tests || [],
          tests_count: (reportData.tests || []).length,
          invoice_id: reportData.bill?.id || null,
        };
      });
      console.log(`Found ${reports.length} medical reports`);
      res.json(reportsWithPatientName);
    } catch (error) {
      console.error("Error fetching medical reports:", error);
      res.status(500).json({ error: "Failed to fetch medical reports" });
    }
  }
);

// Get a specific medical report by ID
router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin", "doctor", "chemist", "receptionist", "employee", "patient"),
  tenantContext,
  async (req, res) => {
    try {
      // Check if this is a PDF generation request for optimized loading
      const isPdfRequest = req.query.pdf === 'true';

      // Optimized query for PDF generation - loads only essential data
      if (isPdfRequest) {
        let whereClause = { id: req.params.id };

        if (req.user.role === 'doctor') {
          const contracts = await db.lab_contracts_doctor.findAll({
            where: { doctor_id: req.user.id },
            attributes: ['lab_id']
          });
          const labIds = contracts.map(c => c.lab_id);
          whereClause.lab_id = { [Op.in]: labIds };
        } else {
          whereClause.lab_id = req.tenant.lab_id;
        }

        const report = await db.medical_report.findOne({
          where: whereClause,
          attributes: [
            "id",
            "lab_id",
            "branch_id",
            "date",
            "registered_at",
            "collected_at",
            "received_at",
            "reported_at",
            "comment",
            "signatory_name",
            "signatory_id",
            "signatory_admin_id",
            "done",
            "pending"
          ],
          include: [
            {
              model: db.patient,
              as: "patient",
              attributes: ["id", "name", "patientcode", "birth_date", "gender"],
              include: [
                {
                  model: db.referral,
                  as: "referral",
                  attributes: ["doctor_name", "specialization"],
                },
              ],
            },
            {
              model: db.test,
              as: "tests",
              through: {
                model: db.medical_report_has_test,
                attributes: ["status", "result"],
              },
              attributes: ["id", "name", "structure_config", "type"],
            },
            {
              model: db.lab,
              as: "lab",
              attributes: ["id", "name", "lab_address", "lab_phone", "lab_email"],
            },
            {
              model: db.admin,
              as: "signatory_admin",
              attributes: [],
              include: [
                {
                  model: db.employee,
                  as: "id_employee",
                  attributes: ["name"],
                },
              ],
            },
            {
              model: db.chemist,
              as: "signatory",
              attributes: [],
              include: [
                {
                  model: db.employee,
                  as: "id_employee",
                  attributes: ["name"],
                },
              ],
            },
          ],
        });

        if (!report) {
          return res.status(404).json({ error: "Medical report not found" });
        }

        // Security check for patients
        if (req.user.role === 'patient' && report.patient_id !== req.user.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Simplified response for PDF generation
        const reportData = report.get({ plain: true });

        // Build component layout and results
        const [componentResults] = await db.sequelize.query(
          "SELECT test_id, parameter_key, result_value, clinical_flag FROM medical_report_results WHERE medical_report_id = ?",
          { replacements: [req.params.id] }
        );
        const testComponentResultsMap = {};
        componentResults.forEach((row) => {
          if (!testComponentResultsMap[row.test_id]) testComponentResultsMap[row.test_id] = {};
          let result = ""; let status = row.clinical_flag || "pending";
          try {
            if (row.result_value) {
              const parsed = typeof row.result_value === 'string' ? JSON.parse(row.result_value) : row.result_value;
              result = parsed.result || ""; status = parsed.status || status;
            }
          } catch (e) { }
          testComponentResultsMap[row.test_id][row.parameter_key] = { result, status };
        });

        if (reportData.tests) {
          reportData.tests.forEach((t) => {
            if (t.structure_config && Array.isArray(t.structure_config)) {
              t.components = t.structure_config
                .filter(item => item.type !== 'header')
                .map((item, index) => {
                  const firstRange = (item.reference_ranges && item.reference_ranges.length > 0) ? item.reference_ranges[0] : {};
                  const compIdStr = (item.key || `key_${index}`).toString();
                  const resObj = testComponentResultsMap[t.id]?.[compIdStr];
                  return {
                    id: compIdStr,
                    name: item.label || item.name || item.key,
                    unit: item.unit || "",
                    normal_from: firstRange.min !== undefined ? firstRange.min : null,
                    normal_to: firstRange.max !== undefined ? firstRange.max : null,
                    c_low: firstRange.panic_min !== undefined ? firstRange.panic_min : null,
                    c_high: firstRange.panic_max !== undefined ? firstRange.panic_max : null,
                    gender: firstRange.gender || null,
                    age_start: item.age_start || null,
                    age_end: item.age_end || null,
                    reference_range: item.reference_range || "",
                    result_type: item.type === 'calculated' ? 'header' : (item.result_type || 'numeric'),
                    results: resObj ? [{ result: resObj.result, status: resObj.status }] : []
                  };
                });
            } else {
              t.components = [];
            }
          });
        }

        const enrichedReport = {
          ...reportData,
          tests_count: reportData.tests?.length || 0,
        };

        return res.json(enrichedReport);
      }

      // Full query for regular requests (non-PDF)
      let whereClause = { id: req.params.id };

      if (req.user.role === 'doctor') {
        const contracts = await db.lab_contracts_doctor.findAll({
          where: { doctor_id: req.user.id },
          attributes: ['lab_id']
        });
        const labIds = contracts.map(c => c.lab_id);
        whereClause.lab_id = { [Op.in]: labIds };
      } else {
        whereClause.lab_id = req.tenant.lab_id;
      }

      const report = await db.medical_report.findOne({
        where: whereClause,
        attributes: [
          "id",
          "lab_id",
          "branch_id",
          "registered_at",
          "collected_at",
          "received_at",
          "reported_at",
          "comment",
          "signatory_name",
          "signatory_id",
          "signatory_admin_id",
        ],
        include: [
          {
            model: db.patient,
            as: "patient",
            attributes: ["id", "name", "patientcode", "birth_date", "gender"],
            include: [
              {
                model: db.referral,
                as: "referral",
                attributes: [
                  "id",
                  "doctor_name",
                  "specialization",
                  "phone",
                  "email",
                ],
              },
            ],
          },
          {
            model: db.test,
            as: "tests",
            through: {
              model: db.medical_report_has_test,
              attributes: ["status", "result"],
            },
            attributes: ["id", "name", "structure_config", "type"],
          },
          {
            model: db.bill,
            as: "bill",
            attributes: ["id", "date"],
          },
          {
            model: db.admin,
            as: "signatory_admin",
            attributes: [],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: db.chemist,
            as: "signatory",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });
      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Security check for patients
      if (req.user.role === 'patient' && report.patient_id !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Process test groups to include proper values structure
      const reportData = report.get({ plain: true });

      // Build component layout and results
      const [componentResults] = await db.sequelize.query(
        "SELECT test_id, parameter_key, result_value, clinical_flag FROM medical_report_results WHERE medical_report_id = ?",
        { replacements: [req.params.id] }
      );
      const testComponentResultsMap = {};
      componentResults.forEach((row) => {
        if (!testComponentResultsMap[row.test_id]) testComponentResultsMap[row.test_id] = {};

        let result = row.result_value;
        let status = row.clinical_flag || "pending";
        testComponentResultsMap[row.test_id][row.parameter_key] = { result, status };
      });

      if (reportData.tests) {
        reportData.tests.forEach((t) => {
          if (t.structure_config && Array.isArray(t.structure_config)) {
            t.components = t.structure_config
              .filter(item => item.type !== 'header')
              .map((item, index) => {
                const firstRange = (item.reference_ranges && item.reference_ranges.length > 0) ? item.reference_ranges[0] : {};
                const compIdStr = (item.key || `key_${index}`).toString();
                const resObj = testComponentResultsMap[t.id]?.[compIdStr];

                // For culture panels, extract status securely but keep whole result_value JSON
                let finalResult = resObj ? resObj.result : null;
                let finalStatus = resObj ? resObj.status : "pending";

                if (item.type !== 'culture_panel' && typeof finalResult === 'string') {
                  try {
                    const parsed = JSON.parse(finalResult);
                    if (parsed && typeof parsed === 'object' && parsed.result !== undefined) {
                      finalResult = parsed.result;
                      if (parsed.status) finalStatus = parsed.status;
                    }
                  } catch (e) { }
                }

                return {
                  id: compIdStr,
                  name: item.label || item.name || item.key,
                  type: item.type || "numeric",
                  unit: item.unit || "",
                  normal_from: firstRange.min !== undefined ? firstRange.min : null,
                  normal_to: firstRange.max !== undefined ? firstRange.max : null,
                  c_low: firstRange.panic_min !== undefined ? firstRange.panic_min : null,
                  c_high: firstRange.panic_max !== undefined ? firstRange.panic_max : null,
                  gender: firstRange.gender || null,
                  age_start: item.age_start || null,
                  age_end: item.age_end || null,
                  reference_range: item.reference_range || "",
                  result_type: item.type === 'calculated' ? 'header' : (item.result_type || 'numeric'),
                  result: finalResult,
                  status: finalStatus
                };
              });
          } else {
            t.components = [];
          }
        });
      }

      const enrichedReport = {
        ...reportData,
        tests_count: reportData.tests?.length || 0,
      };

      res.json(enrichedReport);
    } catch (error) {
      console.error("Error fetching medical report:", error);
      res.status(500).json({ error: "Failed to fetch medical report" });
    }
  }
);

// Create a new medical report
router.post(
  "/",
  authenticateUser,
  authorizeRoles("admin", "doctor", "chemist", "receptionist"),
  invalidateListCache, // Invalidate list cache when new medical report is created
  async (req, res) => {
    try {
      const {
        patient_id,
        doctor_id,
        diagnosis,
        test_ids,
        registered_at,
        collected_at,
        received_at,
        reported_at,
      } = req.body;

      // Validate required fields
      if (!patient_id || !doctor_id || !diagnosis) {
        return res.status(400).json({ error: "Missing required fields" });
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
        reported_at: reported_at || null,
      });

      // Associate tests if provided
      if (test_ids && test_ids.length > 0) {
        await report.setTests(test_ids);
      }
      // Fetch the created report with associations
      const createdReport = await db.medical_report.findByPk(report.id, {
        include: [
          {
            model: db.patient,
            as: "patient",
            attributes: ["id", "name", "patientcode", "birth_date", "gender"],
            include: [
              {
                model: db.referral,
                as: "referral",
                attributes: [
                  "id",
                  "doctor_name",
                  "specialization",
                  "phone",
                  "email",
                ],
              },
            ],
          },
          {
            model: db.test,
            as: "tests",
            through: {
              model: db.medical_report_has_test,
              attributes: ["status", "result"],
            },
            attributes: ["id", "name"],
          },
          {
            model: db.bill,
            as: "bill",
            attributes: ["id", "date"],
          },
          {
            model: db.admin,
            as: "signatory_admin",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: db.chemist,
            as: "signatory",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      res.status(201).json(createdReport);
    } catch (error) {
      console.error("Error creating medical report:", error);
      res.status(500).json({ error: "Failed to create medical report" });
    }
  }
);

// Update a medical report
router.put(
  "/:id",
  authenticateUser,
  authorizeRoles("admin", "doctor", "chemist", "receptionist"),
  tenantContext,
  invalidateMedicalReportCache, // Invalidate cache when medical report is updated
  invalidateListCache, // Invalidate list cache when medical report is updated
  async (req, res) => {
    try {
      const {
        diagnosis,
        test_results,
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
        reported_at,
      } = req.body;

      const report = await db.medical_report.findOne({
        where: {
          id: req.params.id,
          lab_id: req.tenant.lab_id
        }
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
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
      if (signatory_name !== undefined)
        updateFields.signatory_name = signatory_name;
      if (signatory_id !== undefined) updateFields.signatory_id = signatory_id;
      if (signatory_admin_id !== undefined)
        updateFields.signatory_admin_id = signatory_admin_id;
      if (date !== undefined) updateFields.date = date;
      if (registered_at !== undefined)
        updateFields.registered_at = registered_at;
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
              result: testResult.result,
            },
            {
              where: {
                medical_report_id: report.id,
                test_id: testResult.test_id,
              },
            }
          );
        }
      }


      // Fetch the updated report with associations
      const updatedReport = await db.medical_report.findByPk(report.id, {
        include: [
          {
            model: db.patient,
            as: "patient",
            attributes: ["id", "name", "patientcode", "birth_date", "gender"],
            include: [
              {
                model: db.referral,
                as: "referral",
                attributes: [
                  "id",
                  "doctor_name",
                  "specialization",
                  "phone",
                  "email",
                ],
              },
            ],
          },
          {
            model: db.test,
            as: "tests",
            through: {
              model: db.medical_report_has_test,
              attributes: ["status", "result"],
            },
            attributes: ["id", "name"],
          },
          {
            model: db.bill,
            as: "bill",
            attributes: ["id", "date"],
          },
          {
            model: db.admin,
            as: "signatory_admin",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: db.chemist,
            as: "signatory",
            attributes: ["id"],
            include: [
              {
                model: db.employee,
                as: "id_employee",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating medical report:", error);
      res.status(500).json({ error: "Failed to update medical report" });
    }
  }
);

// Delete a medical report
router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles("admin", "doctor", "chemist", "receptionist"),
  tenantContext,
  invalidateListCache, // Invalidate list cache when medical report is deleted
  async (req, res) => {
    try {
      const report = await db.medical_report.findOne({
        where: {
          id: req.params.id,
          lab_id: req.tenant.lab_id
        }
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      await report.destroy();
      res.json({ message: "Medical report deleted successfully" });
    } catch (error) {
      console.error("Error deleting medical report:", error);
      res.status(500).json({ error: "Failed to delete medical report" });
    }
  }
);

// Get test components for a specific test
router.get(
  "/test/:testId/components",
  authenticateUser,
  authorizeRoles("admin", "chemist"),
  async (req, res) => {
    try {
      const test = await db.test.findByPk(req.params.testId, {
        attributes: ["structure_config"]
      });

      if (!test) return res.status(404).json({ error: "Test not found" });

      let testComponents = [];
      if (test.structure_config && Array.isArray(test.structure_config)) {
        testComponents = test.structure_config
          .filter(item => item.type !== 'header')
          .map((item, index) => {
            const firstRange = (item.reference_ranges && item.reference_ranges.length > 0) ? item.reference_ranges[0] : {};
            return {
              id: (item.key || `key_${index}`).toString(),
              name: item.label || item.name || item.key,
              unit: item.unit || "",
              normal_from: firstRange.min !== undefined ? firstRange.min : null,
              normal_to: firstRange.max !== undefined ? firstRange.max : null,
              gender: firstRange.gender || null,
              age_start: item.age_start || null,
              age_end: item.age_end || null,
            };
          });
      }

      res.json(testComponents);
    } catch (error) {
      console.error("Error fetching test components:", error);
      res.status(500).json({ error: "Failed to fetch test components" });
    }
  }
);

// Update test and culture results with auto-calculation
router.put(
  "/:id/results",
  authenticateUser,
  authorizeRoles("admin", "chemist"),
  invalidateTestResultsCache, // Invalidate cache when test results are updated
  async (req, res) => {
    try {
      const { test_results, culture_results } = req.body;
      const reportId = req.params.id;

      // Helper function to calculate test status based on result and normal range
      const calculateTestStatus = (result, normalRange) => {
        if (!result || !normalRange) return "pending";

        const range = normalRange.replace(/\s/g, ""); // Remove spaces
        const match = range.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);

        if (!match) return "pending";

        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        const value = parseFloat(result);

        if (isNaN(value)) return "pending";

        if (value < min) {
          return value < min * 0.5 ? "critical low" : "low";
        } else if (value > max) {
          return value > max * 1.5 ? "critical high" : "high";
        } else {
          return "normal";
        }
      };

      // Update test results with auto-calculated status
      if (test_results) {
        for (const testResult of test_results) {
          const testDef = await db.test.findByPk(testResult.test_id, {
            attributes: ["structure_config"],
          });

          let normalRange = null;
          if (testDef && testDef.structure_config && Array.isArray(testDef.structure_config)) {
            const comps = testDef.structure_config.filter(i => i.type !== 'header');
            if (comps.length > 0 && comps[0].reference_ranges && comps[0].reference_ranges.length > 0) {
              const ranges = comps[0].reference_ranges[0];
              normalRange = `${ranges.min} - ${ranges.max}`;
            }
          }

          const calculatedStatus = calculateTestStatus(
            testResult.result,
            normalRange
          );

          // Sanitize result: if empty string, null, or not a valid number, set to null
          let sanitizedResult = testResult.result;
          if (
            sanitizedResult === "" ||
            sanitizedResult === null ||
            isNaN(Number(sanitizedResult))
          ) {
            sanitizedResult = null;
          } else {
            sanitizedResult = Number(sanitizedResult);
          }

          await db.medical_report_has_test.update(
            {
              status: calculatedStatus,
              result: sanitizedResult,
            },
            {
              where: {
                medical_report_id: reportId,
                test_id: testResult.test_id,
              },
            }
          );
        }
      }

      // Update culture results
      if (culture_results) {
        for (const cultureResult of culture_results) {
          // First, find the medical_report_has_culture record
          const cultureRecord = await db.medical_report_has_culture.findOne({
            where: {
              medical_report_id: reportId,
              culture_id: cultureResult.culture_id,
            },
          });

          if (cultureRecord) {

            // Check if there are actual culture results in medical_report_culture_result table
            const actualCultureResults = await db.medical_report_culture_result.findAll({
              where: {
                medical_report_has_culture_id: cultureRecord.id,
              },
            });

            // Set status based on existence of actual culture results
            const status = actualCultureResults.length > 0 ? "done" : "pending";
            await db.medical_report_has_culture.update(
              {
                status: status,
                result: cultureResult.result, // Keep this for backward compatibility
              },
              {
                where: {
                  medical_report_id: reportId,
                  culture_id: cultureResult.culture_id,
                },
              }
            );
          }
        }
      }

      // Fetch the updated report with all associations
      const updatedReport = await db.medical_report.findByPk(reportId, {
        include: [
          {
            model: db.patient,
            as: "patient",
            attributes: ["id", "name", "patientcode", "birth_date", "gender"],
          },
          {
            model: db.test,
            as: "tests",
            through: {
              model: db.medical_report_has_test,
              attributes: ["status", "result"],
            },
            attributes: ["id", "name"],
          },
          {
            model: db.bill,
            as: "bill",
            attributes: ["id", "date"],
          },
        ],
      });

      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating results:", error);
      res.status(500).json({ error: "Failed to update results" });
    }
  }
);

// Get pending reports count
router.get(
  "/pending-count",
  authenticateUser,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const count = await db.medical_report.count({ where: { pending: true } });
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get pending reports count" });
    }
  }
);

// Get recent reports
router.get(
  "/recent",
  authenticateUser,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const reports = await db.medical_report.findAll({
        order: [["date", "DESC"]],
        limit: 5,
        include: [
          { model: db.patient, as: "patient", attributes: ["id", "name"] },
        ],
      });
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recent reports" });
    }
  }
);

// Increment prints_number for a medical report
router.put(
  "/:id/increment-prints",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const report = await db.medical_report.findByPk(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }
      report.prints_number = (report.prints_number || 0) + 1;
      await report.save();
      res.json(report);
    } catch (error) {
      console.error("Error incrementing prints_number:", error);
      res.status(500).json({ error: "Failed to increment prints_number" });
    }
  }
);
// router.get(
//   "/:id/results-data",
//   authenticateUser,
//   authorizeRoles("admin", "chemist", "receptionist"),
//   async (req, res) => {
//     try {
//       const reportId = req.params.id;

//       /** -----------------------------
//        * 1. Fetch the base medical report
//        * ----------------------------- */
//       const report = await db.medical_report.findByPk(reportId, {
//         attributes: [
//           "id",
//           "lab_id",
//           "branch_id",
//           "date",
//           "registered_at",
//           "collected_at",
//           "received_at",
//           "reported_at",
//           "done",
//           "pending",
//           "comment",
//           "signatory_id",
//           "signatory_admin_id",
//           "signatory_name",
//         ],
//         include: [
//           {
//             model: db.patient,
//             as: "patient",
//             attributes: ["id", "name", "birth_date", "gender", "patientcode"],
//             include: [
//               {
//                 model: db.referral,
//                 as: "referral",
//                 attributes: [
//                   "id",
//                   "doctor_name",
//                   "specialization",
//                   "phone",
//                   "email",
//                 ],
//               },
//             ],
//           },
//         ],
//       });

//       if (!report) {
//         return res.status(404).json({ error: "Medical report not found" });
//       }

//       const reportData = report.get({ plain: true });

//       /** -----------------------------
//        * 2. Fetch related tests
//        * ----------------------------- */
//       const testIds = await db.medical_report_has_test.findAll({
//         attributes: ["test_id"],
//         where: { medical_report_id: reportId },
//         raw: true,
//       });

//       const tests = await db.test.findAll({
//         where: { id: testIds.map((t) => t.test_id) },
//         include: [
//           {
//             model: db.test_component,
//             as: "components",
//             attributes: [
//               "id",
//               "name",
//               "unit",
//               "normal_from",
//               "normal_to",
//               "c_low",
//               "c_high",
//               "gender",
//               "age_start",
//               "age_end",
//               "reference_range",
//               "result_type",
//             ],
//           },
//         ],
//       });

//       // Fetch test-level junction (result/status) and component-level results
//       const [testJunctionRows, componentResults] = await Promise.all([
//         db.medical_report_has_test.findAll({
//           where: { medical_report_id: reportId },
//           attributes: ["test_id", "result", "status"],
//           raw: true,
//         }),
//         db.medical_report_test_component_result.findAll({
//           where: { medical_report_id: reportId },
//           attributes: ["test_id", "test_component_id", "result", "status"],
//           raw: true,
//         }),
//       ]);

//       // Map of test_id -> { result, status }
//       const testJunctionMap = {};
//       testJunctionRows.forEach((row) => {
//         testJunctionMap[row.test_id] = {
//           result: row.result,
//           status: row.status,
//         };
//       });

//       // Map of test_id -> [ { test_component_id, result, status } ]
//       const testComponentResultsMap = {};
//       componentResults.forEach((row) => {
//         if (!testComponentResultsMap[row.test_id]) {
//           testComponentResultsMap[row.test_id] = [];
//         }
//         testComponentResultsMap[row.test_id].push({
//           test_component_id: row.test_component_id,
//           result: row.result,
//           status: row.status,
//         });
//       });

//       /** -----------------------------
//        * 3. Fetch related cultures
//        * ----------------------------- */
//       const cultures = await db.medical_report_has_culture.findAll({
//         where: { medical_report_id: reportId },
//         include: [
//           {
//             model: db.culture,
//             as: "culture",
//             attributes: ["id", "name", "price", "sample_type_id", "category_id"],
//           },
//           {
//             model: db.medical_report_has_culture_antibiotic,
//             as: "culture_antibiotics",
//             include: [
//               {
//                 model: db.antibiotic,
//                 as: "antibiotic",
//                 attributes: ["id", "name", "shortcut", "commercial_name"],
//               },
//             ],
//           },
//           {
//             model: db.medical_report_culture_result,
//             as: "culture_results",
//             attributes: [
//               "id",
//               "culture_option_name",
//               "culture_sub_option_name",
//               "custom_result",
//               "result_type",
//               "created_at",
//               "updated_at",
//             ],
//           },
//         ],
//       });

//       /** -----------------------------
//        * 4. Fetch test group results
//        * ----------------------------- */
//       const testGroupResults = await db.test_group_result.findAll({
//         where: { medical_report_id: reportId },
//         attributes: ["id", "result_json"],
//         include: [
//           {
//             model: db.test_group,
//             as: "test_group",
//             attributes: ["id", "name"],
//             required: false,
//           },
//           {
//             model: db.tg_component,
//             as: "tg_component",
//             attributes: ["id", "name", "reference_range", "result_type"],
//             required: false,
//             include: [
//               {
//                 model: db.tgc_category,
//                 as: "category",
//                 attributes: ["id", "name"],
//                 required: false,
//               },
//             ],
//           },
//         ],
//       });

//       /** -----------------------------
//        * 5. Assemble final response
//        * ----------------------------- */
//       // Attach junction result/status to each test
//       const testsPlain = tests.map((t) => {
//         const plain = t.get({ plain: true });
//         const j = testJunctionMap[plain.id];
//         if (j) {
//           plain.medical_report_has_test = { result: j.result, status: j.status };
//         }
//         // Optionally embed component results directly for convenience
//         const perTestResults = testComponentResultsMap[plain.id] || [];
//         if (perTestResults.length > 0 && Array.isArray(plain.components)) {
//           const resultByCompId = {};
//           perTestResults.forEach((r) => {
//             resultByCompId[r.test_component_id] = { result: r.result, status: r.status };
//           });
//           plain.components = plain.components.map((c) => ({
//             ...c,
//             // This mirrors the old structure from "/:id" so the client can prefill seamlessly
//             results: resultByCompId[c.id] ? [ { id: undefined, result: resultByCompId[c.id].result, status: resultByCompId[c.id].status } ] : [],
//           }));
//         }
//         return plain;
//       });

//       reportData.tests = testsPlain;

//       reportData.cultures = cultures.map((c) => c.get({ plain: true }));

//       reportData.test_group_results = testGroupResults.map((r) => ({
//         ...r.get({ plain: true }),
//         results: r.result_json,
//         result_json: undefined,
//       }));

//       reportData.test_groups = [
//         ...new Map(
//           testGroupResults
//             .filter((r) => r.test_group) // avoid nulls
//             .map((r) => [r.test_group.id, r.test_group])
//         ).values(),
//       ];

//       // Expose a top-level test_component_results map for direct access if needed by client
//       reportData.test_component_results = testComponentResultsMap;

//       res.json(reportData);
//     } catch (error) {
//       console.error("Error fetching comprehensive results data:", error);
//       res.status(500).json({
//         error: "Failed to fetch results data",
//         details: process.env.NODE_ENV === "development" ? error.message : undefined,
//       });
//     }
//   }
// );
router.get(
  "/:id/results-data",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  tenantContext,
  cacheMedicalReportNewResultsData, // Redis cache middleware for performance optimization
  async (req, res) => {
    try {
      const reportId = req.params.id;

      /** -----------------------------
       * 1. Fetch the report and related tests with the components
       * ----------------------------- */

      // Fetch test-level junction (result/status)
      const [report, testJunctionRows] = await Promise.all([
        db.medical_report.findOne({
          where: { id: reportId, lab_id: req.tenant.lab_id },
          attributes: [
            "id",
            "lab_id",
            "branch_id",
            "date",
            "registered_at",
            "collected_at",
            "received_at",
            "reported_at",
            "done",
            "pending",
            "comment",
            "signatory_id",
            "signatory_admin_id",
            "signatory_name",
          ],
          include: [
            {
              model: db.patient,
              as: "patient",
              attributes: ["id", "name", "birth_date", "gender", "patientcode"],
              include: [
                {
                  model: db.referral,
                  as: "referral",
                  attributes: [
                    "id",
                    "doctor_name",
                    "specialization",
                    "phone",
                    "email",
                  ],
                },
              ],
            },
          ],
        }),
        db.medical_report_has_test.findAll({
          where: { medical_report_id: reportId },
          attributes: ["test_id", "result", "status"],
          raw: true,
        }),
      ]);

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      const reportData = report.get({ plain: true });
      const testIds = testJunctionRows.map(r => r.test_id);
      // Map of test_id -> { result, status }
      const testComponentResultsMap = {};

      const testJunctionMap = {};
      testJunctionRows.forEach((row) => {
        testJunctionMap[row.test_id] = {
          result: row.result,
          status: row.status,
        };
      });

      // Raw query to get component results from the newly migrated table
      const [componentResults] = await db.sequelize.query(
        "SELECT test_id, parameter_key, result_value, clinical_flag FROM medical_report_results WHERE medical_report_id = ?",
        { replacements: [reportId] }
      );

      componentResults.forEach((row) => {
        if (!testComponentResultsMap[row.test_id]) {
          testComponentResultsMap[row.test_id] = {};
        }

        let result = row.result_value;
        let status = row.clinical_flag || "pending";

        try {
          if (row.result_value) {
            let parsed = typeof row.result_value === 'string' ? JSON.parse(row.result_value) : row.result_value;
            if (parsed && typeof parsed === 'object' && parsed.result !== undefined) {
              result = parsed.result;
              status = parsed.status || status;
            } else {
              result = parsed;
            }
          }
        } catch (e) {
          console.warn("Failed to parse result_value:", row.result_value);
        }

        testComponentResultsMap[row.test_id][row.parameter_key] = {
          result: result,
          status: status,
        };
      });
      /** -----------------------------
       * 2. Fetch related tests
       * ----------------------------- */
      const tests = testIds.length > 0 ? await db.test.findAll({
        where: { id: testIds }
      }) : [];

      /** -----------------------------
       * 3. Assemble final response
       * ----------------------------- */
      // Attach junction result/status to each test
      const testsPlain = tests.map((t) => {
        const plain = t.get({ plain: true });
        const j = testJunctionMap[plain.id];
        if (j) {
          plain.medical_report_has_test = { result: j.result, status: j.status };
        }

        // Map structure_config to legacy components array for frontend backward compatibility
        if (plain.structure_config && Array.isArray(plain.structure_config)) {
          plain.components = plain.structure_config
            .filter(item => item.type !== 'header')
            .map((item, index) => {
              // Extract first reference range if available for backward compatibility
              const firstRange = (item.reference_ranges && item.reference_ranges.length > 0) ? item.reference_ranges[0] : {};
              return {
                id: item.key || `key_${index}`, // string IDs work dynamically
                name: item.label || item.name || item.key,
                unit: item.unit || "",
                normal_from: firstRange.min !== undefined ? firstRange.min : null,
                normal_to: firstRange.max !== undefined ? firstRange.max : null,
                c_low: firstRange.panic_min !== undefined ? firstRange.panic_min : null,
                c_high: firstRange.panic_max !== undefined ? firstRange.panic_max : null,
                gender: firstRange.gender || null,
                age_start: item.age_start || null,
                age_end: item.age_end || null,
                reference_range: item.reference_range || "",
                result_type: item.type === 'calculated' ? 'header' : (item.result_type || 'numeric'),
              };
            });
        } else {
          plain.components = [];
        }

        return plain;
      });

      reportData.tests = testsPlain;
      reportData.cultures = [];

      // Expose a top-level test_component_results map for direct access if needed by client
      reportData.test_component_results = testComponentResultsMap;

      res.json(reportData);
    } catch (error) {
      console.error("Error fetching comprehensive results data:", error);
      res.status(500).json({
        error: "Failed to fetch results data",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);


// Helper function to handle deadlock retries
const executeWithDeadlockRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Check if it's a deadlock error
      if (
        error.original &&
        error.original.code === "ER_LOCK_DEADLOCK" &&
        attempt < maxRetries
      ) {
        console.log(`Deadlock detected on attempt ${attempt}, retrying...`);
        // Wait a random amount of time before retrying (exponential backoff with jitter)
        const delay = Math.random() * Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};



// Update collected date
router.post(
  "/:reportId/collected",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { reportId } = req.params;

      // Update the collected_at date
      await updateMedicalReportDates(reportId, "collected", t);

      await t.commit();
      res.json({ success: true });
    } catch (error) {
      if (t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
      }
      console.error("Error updating collected date:", error);
      res.status(500).json({ error: "Failed to update collected date" });
    }
  }
);



// Save culture options data to medical_report_culture_result table
// Endpoint removed as cultures are now managed by standard medical_report_results

// Diagnostic endpoint to check test associations
router.get(
  "/:reportId/tests/check",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const { reportId } = req.params;

      // Get the medical report with all its test associations
      const medicalReport = await db.medical_report.findByPk(reportId, {
        include: [
          {
            model: db.test,
            as: "tests",
            through: { attributes: ["id", "result", "status"] },
            attributes: ["id", "name"],
          },
          {
            model: db.medical_report_has_test,
            as: "medical_report_has_tests",
            attributes: ["id", "test_id", "result", "status"],
          },
        ],
      });

      if (!medicalReport) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Also get all tests in the system for comparison
      const allTests = await db.test.findAll({
        attributes: ["id", "name"],
      });

      res.json({
        medicalReport: {
          id: medicalReport.id,
          date: medicalReport.date,
          patient_id: medicalReport.patient_id,
        },
        associatedTests: medicalReport.tests || [],
        testAssociations: medicalReport.medical_report_has_tests || [],
        allTests: allTests,
        summary: {
          totalTestsInSystem: allTests.length,
          testsAssociatedWithReport: medicalReport.tests?.length || 0,
          testAssociationsCount:
            medicalReport.medical_report_has_tests?.length || 0,
        },
      });
    } catch (error) {
      console.error("Error checking test associations:", error);
      res.status(500).json({ error: "Failed to check test associations" });
    }
  }
);



// Import medical reports from Excel/CSV
router.post(
  "/import",
  authenticateUser,
  authorizeRoles("admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // Validate the Excel file buffer
      const validation = validateExcelBuffer(req.file.buffer);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      // Read Excel file using secure ExcelJS service
      const data = await readExcelBuffer(req.file.buffer);

      if (data.length === 0) {
        return res.status(400).json({ error: "No data found in the file" });
      }

      let imported = 0,
        updated = 0,
        errors = [];
      for (const row of data) {
        if (!row["Patient ID"]) {
          errors.push(
            `Missing required field Patient ID in row: ${JSON.stringify(row)}`
          );
          continue;
        }
        let report = null;
        if (row.ID) {
          report = await db.medical_report.findByPk(row.ID);
        }
        const reportData = {
          patient_id: row["Patient ID"],
          date: row.Date || null,
          prints_number: row.Prints || 0,
          whatsapp_sends: row["WhatsApp Sends"] || 0,
          done: row.Done || 0,
          signatory_id: row["Signatory ID"] || null,
          pending: row.Pending || 0,
          comment: row.Comment || null,
          signatory_admin_id: row["Signatory Admin ID"] || null,
          signatory_name: row["Signatory Name"] || null,
          bill_id: row["Bill ID"] || null,
        };
        if (report) {
          await report.update(reportData);
          updated++;
        } else {
          await db.medical_report.create(reportData);
          imported++;
        }
      }
      // No need to clean up file since we're using memory storage
      res.json({ imported, updated, errors });
    } catch (error) {
      console.error("Error importing medical reports:", error);
      res.status(500).json({ error: "Failed to import medical reports" });
    }
  }
);

// Bulk save all results for a medical report
router.post(
  "/:id/results/bulk",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  invalidateTestResultsCache, // Invalidate cache when bulk results are updated
  // Invalidate cache when bulk culture results are updated
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const reportId = req.params.id;
      const {
        test_results = [],
        test_component_results = {},
        test_group_values = {},
      } = req.body;

      console.log("Bulk save request:", {
        reportId,
        test_results: test_results.length,
        test_component_results: Object.keys(test_component_results).length,
        test_group_values: Object.keys(test_group_values).length,
      });

      // Verify medical report exists
      const medicalReport = await db.medical_report.findByPk(reportId, {
        transaction: t,
      });
      if (!medicalReport) {
        await t.rollback();
        return res.status(404).json({ error: "Medical report not found" });
      }

      let hasAnyResults = false;

      // Helper function to calculate test status based on result and normal range
      const calculateTestStatus = (result, component) => {
        if (!result || result.toString().trim() === '') return 'pending';

        // If no normal range is available, set to 'done'
        if (!component || component.normal_from === null || component.normal_to === null) {
          return 'done';
        }

        const numericResult = parseFloat(result);
        if (isNaN(numericResult)) return 'done'; // For text results, just mark as done

        const min = parseFloat(component.normal_from);
        const max = parseFloat(component.normal_to);

        if (isNaN(min) || isNaN(max)) return 'done';

        // Use critical thresholds if available, otherwise calculate as 50% below/above normal range
        const criticalLowThreshold = component.c_low !== null ? component.c_low : min * 0.5;
        const criticalHighThreshold = component.c_high !== null ? component.c_high : max * 1.5;

        if (numericResult < criticalLowThreshold) {
          return 'critical low';
        } else if (numericResult < min) {
          return 'low';
        } else if (numericResult > criticalHighThreshold) {
          return 'critical high';
        } else if (numericResult > max) {
          return 'high';
        } else {
          return 'normal';
        }
      };

      // 1. Save test results (for tests without components)
      if (test_results.length > 0) {
        const testPromises = test_results.map(async (result) => {
          if (result.result && result.result.toString().trim() !== "") {
            hasAnyResults = true;
            // For tests without components, status is 'done' if result exists, 'pending' if empty
            const status = result.result && result.result.toString().trim() !== '' ? 'done' : 'pending';

            return db.medical_report_has_test.update(
              {
                result: result.result,
                status: status,
                updatedAt: new Date(),
              },
              {
                where: {
                  medical_report_id: reportId,
                  test_id: result.test_id,
                },
                transaction: t,
              }
            );
          }
        });
        await Promise.all(testPromises);
      }

      // 2. Save test component results
      if (Object.keys(test_component_results).length > 0) {
        for (const [testId, components] of Object.entries(
          test_component_results
        )) {
          // Access test structure_config for normal ranges
          const testDef = await db.test.findByPk(parseInt(testId, 10), { transaction: t });
          const structureConfig = testDef ? (testDef.structure_config || []) : [];

          const componentResultsToSave = [];

          for (const [componentId, componentData] of Object.entries(components)) {
            if (
              componentData.result &&
              componentData.result.toString().trim() !== ""
            ) {
              hasAnyResults = true;

              // Extract normal range from structure_config
              const component = structureConfig.find(tc => (tc.key || '').toString() === componentId.toString());
              let compForStatus = null;
              if (component && component.reference_ranges && component.reference_ranges.length > 0) {
                const firstRange = component.reference_ranges[0];
                compForStatus = {
                  normal_from: firstRange.min !== undefined ? firstRange.min : null,
                  normal_to: firstRange.max !== undefined ? firstRange.max : null,
                  c_low: firstRange.panic_min !== undefined ? firstRange.panic_min : null,
                  c_high: firstRange.panic_max !== undefined ? firstRange.panic_max : null,
                };
              }

              const calculatedStatus = calculateTestStatus(componentData.result, compForStatus);

              componentResultsToSave.push({
                medical_report_id: parseInt(reportId, 10),
                test_id: parseInt(testId, 10),
                parameter_key: componentId,
                result_value: JSON.stringify({ result: componentData.result, status: calculatedStatus }),
                clinical_flag: calculatedStatus,
                workflow_status: 'analyzed',
              });
            }
          }

          if (componentResultsToSave.length > 0) {
            // Delete existing results for this test using raw query
            await db.sequelize.query(
              'DELETE FROM medical_report_results WHERE medical_report_id = ? AND test_id = ?',
              { replacements: [parseInt(reportId, 10), parseInt(testId, 10)], transaction: t }
            );

            // Bulk create new results via raw queries
            for (const r of componentResultsToSave) {
              await db.sequelize.query(
                'INSERT INTO medical_report_results (medical_report_id, test_id, parameter_key, result_value, clinical_flag, workflow_status) VALUES (?, ?, ?, ?, ?, ?)',
                {
                  replacements: [r.medical_report_id, r.test_id, r.parameter_key, r.result_value, r.clinical_flag, r.workflow_status],
                  transaction: t
                }
              );
            }
          }
        });
await Promise.all(culturePromises);
      }


// 4. Save test group values
if (Object.keys(test_group_values).length > 0) {
  for (const [groupId, components] of Object.entries(test_group_values)) {
    const valuesPayload = {};
    let hasGroupValues = false;

    Object.entries(components).forEach(([componentId, fields]) => {
      valuesPayload[componentId] = {};
      Object.entries(fields).forEach(([fieldId, value]) => {
        valuesPayload[componentId][fieldId] = value;
        if (value && value.toString().trim() !== "") {
          hasGroupValues = true;
          hasAnyResults = true;
        }
      });
    });

    if (hasGroupValues) {
      await saveTestGroupValuesWithRetry(
        reportId,
        parseInt(groupId, 10),
        valuesPayload,
        t
      );
    }
  }
}

// Update received_at date if any results were saved
if (hasAnyResults) {
  await updateMedicalReportDates(reportId, "received", t);
}

await t.commit();
console.log(
  `Successfully bulk saved results for medical report ${reportId}`
);

res.json({
  success: true,
  message: "All results saved successfully",
  hasResults: hasAnyResults,
});
    } catch (error) {
  if (t && !t.finished) {
    try {
      await t.rollback();
    } catch (rollbackError) {
      console.error("Error rolling back transaction:", rollbackError);
    }
  }
  console.error("Error bulk saving results:", error);
  res.status(500).json({
    error: "Failed to save results",
    details:
      process.env.NODE_ENV === "development" ? error.message : undefined,
  });
}
  }
);

// ==================== COMMENT ROUTES ====================

// Get comments for a specific medical report
router.get(
  "/:id/comments",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist", "employee"),
  tenantContext,
  async (req, res) => {
    try {
      const { id: reportId } = req.params;

      // Verify medical report belongs to current lab
      const report = await db.medical_report.findOne({
        where: { id: reportId, lab_id: req.tenant.lab_id },
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Get test comments
      const testComments = await db.test_comments.findAll({
        where: { medical_report_id: reportId },
        include: [
          {
            model: db.test,
            as: "test",
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });


      // Get images for all comments
      const testCommentIds = testComments.map(c => c.id);
      const reportCommentIds = [reportId]; // For medical report main comment

      const [testImages, reportImages] = await Promise.all([
        testCommentIds.length > 0 ? db.comment_images.findAll({
          where: {
            comment_type: 'test',
            comment_id: { [Op.in]: testCommentIds }
          },
          order: [['upload_order', 'ASC']]
        }) : [],
        db.comment_images.findAll({
          where: {
            comment_type: 'medical_report',
            comment_id: reportId
          },
          order: [['upload_order', 'ASC']]
        })
      ]);

      // Group images by comment
      const groupImagesByComment = (images) => {
        return images.reduce((acc, img) => {
          if (!acc[img.comment_id]) acc[img.comment_id] = [];
          acc[img.comment_id].push(img);
          return acc;
        }, {});
      };

      const testImagesGrouped = groupImagesByComment(testImages);
      const reportImagesGrouped = groupImagesByComment(reportImages);

      // Attach images to comments
      const testCommentsWithImages = testComments.map(comment => ({
        ...comment.toJSON(),
        images: testImagesGrouped[comment.id] || []
      }));

      res.json({
        testComments: testCommentsWithImages,
        reportImages: reportImagesGrouped[reportId] || []
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  }
);

// Create test comment
router.post(
  "/:id/test-comments",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist", "employee"),
  tenantContext,
  (req, res, next) => {
    // Add comment type to request body for secure filename generation
    req.body.commentType = 'test';
    next();
  },
  imageUpload.array('images', 3),
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { id: reportId } = req.params;
      const { test_id, comment } = req.body;

      // Verify medical report belongs to current lab
      const report = await db.medical_report.findOne({
        where: { id: reportId, lab_id: req.tenant.lab_id },
        transaction: t
      });

      if (!report) {
        await t.rollback();
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Create test comment
      const testComment = await db.test_comments.create({
        medical_report_id: reportId,
        test_id,
        comment
      }, { transaction: t });

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        const imageRecords = req.files.map((file, index) => ({
          comment_type: 'test',
          comment_id: testComment.id,
          image_path: file.path,
          image_name: file.originalname,
          image_size: file.size,
          mime_type: file.mimetype,
          upload_order: index + 1
        }));

        await db.comment_images.bulkCreate(imageRecords, { transaction: t });
      }

      await t.commit();
      res.status(201).json({ success: true, comment: testComment });
    } catch (error) {
      await t.rollback();
      console.error("Error creating test comment:", error);
      res.status(500).json({ error: "Failed to create test comment" });
    }
  }
);


// Upload images for medical report main comment
router.post(
  "/:id/comment-images",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist", "employee"),
  tenantContext,
  (req, res, next) => {
    // Add comment type to request body for secure filename generation
    req.body.commentType = 'medical_report';
    next();
  },
  imageUpload.array('images', 3),
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { id: reportId } = req.params;

      // Verify medical report belongs to current lab
      const report = await db.medical_report.findOne({
        where: { id: reportId, lab_id: req.tenant.lab_id },
        transaction: t
      });

      if (!report) {
        await t.rollback();
        return res.status(404).json({ error: "Medical report not found" });
      }
      // Delete existing images for this medical report
      const deletedCount = await db.comment_images.destroy({
        where: {
          comment_type: 'medical_report',
          comment_id: reportId
        },
        transaction: t
      });

      // Handle new image uploads
      if (req.files && req.files.length > 0) {
        const imageRecords = req.files.map((file, index) => ({
          comment_type: 'medical_report',
          comment_id: reportId,
          image_path: file.path,
          image_name: file.originalname,
          image_size: file.size,
          mime_type: file.mimetype,
          upload_order: index + 1
        }));

        await db.comment_images.bulkCreate(imageRecords, { transaction: t });
      }

      await t.commit();
      res.status(201).json({ success: true, message: "Images uploaded successfully" });
    } catch (error) {
      await t.rollback();
      console.error("Error uploading comment images:", error);
      res.status(500).json({ error: "Failed to upload images" });
    }
  }
);

// Delete test comment
router.delete(
  "/test-comments/:commentId",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist", "employee"),
  tenantContext,
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { commentId } = req.params;

      // Find comment and verify it belongs to current lab
      const comment = await db.test_comments.findOne({
        where: { id: commentId },
        include: [{
          model: db.medical_report,
          as: "medical_report",
          where: { lab_id: req.tenant.lab_id }
        }],
        transaction: t
      });

      if (!comment) {
        await t.rollback();
        return res.status(404).json({ error: "Comment not found" });
      }

      // Delete associated images
      await db.comment_images.destroy({
        where: {
          comment_type: 'test',
          comment_id: commentId
        },
        transaction: t
      });

      // Delete comment
      await db.test_comments.destroy({
        where: { id: commentId },
        transaction: t
      });

      await t.commit();
      res.json({ success: true, message: "Comment deleted successfully" });
    } catch (error) {
      await t.rollback();
      console.error("Error deleting test comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);


// Get entry form for dynamic result entry
router.get(
  "/:id/entry-form",
  authenticateUser,
  authorizeRoles("admin", "doctor", "chemist", "employee"),
  tenantContext,
  async (req, res) => {
    try {
      const report = await db.medical_report.findOne({
        where: { id: req.params.id, lab_id: req.tenant.lab_id },
        include: [
          {
            model: db.patient,
            as: "patient",
            attributes: ["id", "gender", "birth_date"]
          },
          {
            model: db.test,
            as: "tests",
            attributes: ["id", "name", "structure_config", "type"],
            through: { attributes: [] }
          }
        ]
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Also get existing results if any
      const existingResults = await db.medical_report_results.findAll({
        where: { medical_report_id: report.id }
      });

      const resultsMap = {};
      existingResults.forEach(r => {
        if (!resultsMap[r.test_id]) resultsMap[r.test_id] = {};
        let val = r.result_value;
        try {
          if (typeof val === 'string') val = JSON.parse(val);
        } catch (e) { }
        resultsMap[r.test_id][r.parameter_key] = {
          value: val,
          clinical_flag: r.clinical_flag
        };
      });

      res.json({
        report_id: report.id,
        patient: report.patient,
        tests: report.tests.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          structure_config: typeof t.structure_config === 'string' ? JSON.parse(t.structure_config || "[]") : t.structure_config,
          results: resultsMap[t.id] || {}
        }))
      });
    } catch (error) {
      console.error("Error fetching entry form:", error);
      res.status(500).json({ error: "Failed to fetch entry form data" });
    }
  }
);

function calculatePatientAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// POST dynamic results
router.post(
  "/:id/results",
  authenticateUser,
  authorizeRoles("admin", "chemist", "employee"),
  tenantContext,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { test_id, results } = req.body; // results is an object { [parameter_key]: result_value }

      if (!test_id || !results) {
        return res.status(400).json({ error: "Missing test_id or results payload" });
      }

      const report = await db.medical_report.findOne({
        where: { id, lab_id: req.tenant.lab_id },
        include: [{ model: db.patient, as: "patient" }]
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      const test = await db.test.findOne({
        where: { id: test_id }
      });

      if (!test || !test.structure_config) {
        return res.status(400).json({ error: "Test not found or has no structure config" });
      }

      // Age calculation is simplified to years for now
      const patientAge = calculatePatientAge(report.patient?.birth_date);
      const patientGender = report.patient?.gender;

      const structureConfig = typeof test.structure_config === 'string'
        ? JSON.parse(test.structure_config || "[]")
        : (test.structure_config || []);

      const resultsToSave = [];

      for (const [parameterKey, resultVal] of Object.entries(results)) {
        // Find matching structural parameter (JSON config can have key, name or label)
        const paramDef = structureConfig.find(p => p.key === parameterKey || p.name === parameterKey || p.label === parameterKey);
        let clinical_flag = "normal";

        if (paramDef && paramDef.type !== 'header' && paramDef.reference_ranges) {
          // Find applicable range based on age and gender
          const applicableRange = paramDef.reference_ranges.find(r => {
            const genderMatch = !r.gender || r.gender.toLowerCase() === 'all' || r.gender.toLowerCase() === (patientGender || '').toLowerCase();
            const ageMatch = true; // Further refine age_start and age_end logic here if needed
            return genderMatch && ageMatch;
          });

          if (applicableRange) {
            let numVal = parseFloat(resultVal);
            // If resultVal is an object like { value: 5.5 }, extract it
            if (typeof resultVal === 'object' && resultVal !== null && resultVal.value !== undefined) {
              numVal = parseFloat(resultVal.value);
            }

            if (!isNaN(numVal)) {
              if (applicableRange.panic_min !== undefined && applicableRange.panic_min !== null && numVal <= applicableRange.panic_min) {
                clinical_flag = "panic_low";
              } else if (applicableRange.panic_max !== undefined && applicableRange.panic_max !== null && numVal >= applicableRange.panic_max) {
                clinical_flag = "panic_high";
              } else if (applicableRange.min !== undefined && applicableRange.min !== null && numVal < applicableRange.min) {
                clinical_flag = "low";
              } else if (applicableRange.max !== undefined && applicableRange.max !== null && numVal > applicableRange.max) {
                clinical_flag = "high";
              }
            }
          }
        }

        resultsToSave.push({
          medical_report_id: report.id,
          test_id: test.id,
          parameter_key: parameterKey,
          result_value: resultVal,
          clinical_flag: clinical_flag,
          workflow_status: "analyzed"
        });
      }

      // Since there is no unique constraint on medical_report_results for Upsert,
      // we'll destroy and rewrite for this test specifically.
      const t = await db.sequelize.transaction();
      try {
        await db.medical_report_results.destroy({
          where: {
            medical_report_id: report.id,
            test_id: test.id,
            parameter_key: { [Op.in]: Object.keys(results) }
          },
          transaction: t
        });

        await db.medical_report_results.bulkCreate(resultsToSave, { transaction: t });

        await t.commit();
        res.json({ success: true, message: "Results saved successfully", results: resultsToSave });
      } catch (err) {
        console.error("TRANSACTION ERROR inside POST /results:", err);
        try {
          if (!t.finished) {
            await t.rollback();
          }
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }
        throw err;
      }

    } catch (error) {
      console.error("Error saving dynamic results:", error);
      res.status(500).json({ error: "Failed to save results" });
    }
  }
);

module.exports = router;
