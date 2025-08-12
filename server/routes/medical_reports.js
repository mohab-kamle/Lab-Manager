const express = require("express");
const router = express.Router();
const db = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const { Op, where } = require("sequelize");
const multer = require("multer");
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
  authorizeRoles("admin", "chemist", "receptionist", "employee"),
  tenantContext,
  async (req, res) => {
    try {
      // Get medical_report_ids for the current lab
      const medicalReportIds = await db.medical_report
        .findAll({
          attributes: ["id"],
          where: {
            lab_id: req.tenant.lab_id,
          },
          raw: true,
        })
        .then((reports) => reports.map((report) => report.id));

      // First, get the count of test groups for each medical report
      const testGroupCounts = await db.medical_report_has_tg.findAll({
        attributes: [
          "medical_report_id",
          [
            db.sequelize.fn("COUNT", db.sequelize.col("test_group_id")),
            "count",
          ],
        ],
        where: {
          medical_report_id: {
            [Op.in]: medicalReportIds,
          },
        },
        group: ["medical_report_id"],
        raw: true,
      });

      // Create a map of medical_report_id -> test group count
      const testGroupCountMap = {};
      testGroupCounts.forEach((item) => {
        testGroupCountMap[item.medical_report_id] = parseInt(item.count, 10);
      });

      // Note: Test and culture counts are now calculated from the actual associations
      // instead of separate count queries for better accuracy and performance

      // Then get all medical reports with their associations
      const reports = await db.medical_report.findAll({
        where: {
          lab_id: req.tenant.lab_id,
        },
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
            model: db.culture,
            as: "cultures",
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

      // Add patient_name, counts, and test group counts to each report for easier access
      const reportsWithPatientName = reports.map((report) => {
        const reportData = report.get({ plain: true });
        return {
          ...reportData,
          patient_name: reportData.patient?.name || "Unknown Patient",
          tests: reportData.tests || [],
          cultures: reportData.cultures || [],
          tests_count: (reportData.tests || []).length,
          cultures_count: (reportData.cultures || []).length,
          test_groups_count: testGroupCountMap[reportData.id] || 0,
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
  authorizeRoles("admin", "doctor", "chemist", "receptionist", "employee"),
  async (req, res) => {
    try {
      // Check if this is a PDF generation request for optimized loading
      const isPdfRequest = req.query.pdf === 'true';
      
      // Optimized query for PDF generation - loads only essential data
      if (isPdfRequest) {
        const report = await db.medical_report.findByPk(req.params.id, {
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
              include: [
                {
                  model: db.test_component,
                  as: "components",
                  attributes: [
                    "id",
                    "name",
                    "unit",
                    "normal_from",
                    "normal_to",
                    "gender",
                    "age_start",
                    "age_end",
                    "test_id",
                  ],
                  include: [
                    {
                      model: db.medical_report_test_component_result,
                      as: "results",
                      attributes: ["result", "status"],
                      where: {
                        medical_report_id: req.params.id
                      },
                      required: false
                    },
                  ],
                },
              ],
              attributes: ["id", "name"],
            },
            {
              model: db.medical_report_has_culture,
              as: "medical_report_has_cultures",
              attributes: ["id", "status", "result"],
              include: [
                {
                  model: db.medical_report_has_culture_antibiotic,
                  as: "culture_antibiotics",

                  include: [
                    {
                      model: db.antibiotic,
                      as: "antibiotic",
                      attributes: ["id", "name", "shortcut", "commercial_name"],
                    },
                  ],
                },
                {
                  model: db.medical_report_culture_result,
                  as: "culture_results",
                  attributes: [
                    "culture_option_name",
                    "culture_sub_option_name",
                    "custom_result",
                    "result_type",
                  ],
                },
                {
                  model: db.culture,
                  as: "culture",
                  attributes: ["id", "name"],
                },
              ],
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

        // Simplified response for PDF generation
        const reportData = report.get({ plain: true });
        const enrichedReport = {
          ...reportData,
          tests_count: reportData.tests?.length || 0,
          cultures_count: reportData.medical_report_has_cultures?.length || 0,
        };

        return res.json(enrichedReport);
      }
      
      // Full query for regular requests (non-PDF)
      const report = await db.medical_report.findByPk(req.params.id, {
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
            include: [
              {
                model: db.test_component,
                as: "components",
                attributes: [
                  "id",
                  "name",
                  "unit",
                  "normal_from",
                  "normal_to",
                  "gender",
                  "age_start",
                  "age_end",
                  "test_id",
                ],
                include: [
                  {
                    model: db.medical_report_test_component_result,
                    as: "results",
                    attributes: ["id", "result", "status"],
                  },
                ],
              },
            ],
            attributes: ["id", "name"],
          },
          {
            model: db.medical_report_has_culture,
            as: "medical_report_has_cultures",
            attributes: ["id", "status", "result"],
            include: [
              {
                model: db.medical_report_has_culture_antibiotic,
                as: "culture_antibiotics",
                include: [
                  {
                    model: db.antibiotic,
                    as: "antibiotic",
                    attributes: ["id", "name", "shortcut", "commercial_name"],
                  },
                ],
              },
              {
                model: db.medical_report_culture_result,
                as: "culture_results",
                attributes: [
                  "id",
                  "culture_option_name",
                  "culture_sub_option_name",
                  "custom_result",
                  "result_type",
                ],
              },
              {
                model: db.culture,
                as: "culture",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            // Get test groups through the junction table to get proper structure
            model: db.medical_report_has_tg,
            as: "medical_report_has_tgs",
            attributes: ["medical_report_id", "test_group_id", "value"],
            include: [
              {
                model: db.test_group,
                as: "test_group",
                required: false,
                paranoid: false,
                attributes: ["id", "name", "price", "deleted_at"],
                include: [
                  {
                    model: db.tg_component,
                    as: "tg_components",
                    required: false,
                    paranoid: false,
                    attributes: [
                      "id",
                      "test_group_id",
                      "test_category_id",
                      "name",
                    ],
                  },
                  {
                    model: db.tgc_category,
                    as: "tgc_categories",
                    required: false,
                    paranoid: false,
                    attributes: ["id", "name", "test_group_id"],
                    include: [
                      {
                        model: db.tg_component,
                        as: "tg_components",
                        required: false,
                        paranoid: false,
                        attributes: [
                          "id",
                          "test_group_id",
                          "test_category_id",
                          "name",
                        ],
                      },
                    ],
                  },
                  {
                    model: db.tg_fields,
                    as: "tg_fields",
                    required: false,
                    paranoid: false,
                    attributes: ["id", "name", "test_group_id"],
                  },
                  {
                    model: db.field_comp_options,
                    as: "field_comp_options",
                    required: false,
                    paranoid: false,
                    attributes: [
                      "id",
                      "name",
                      "tg_component_id",
                      "tg_fields_id",
                      "test_group_id",
                    ],
                  },
                ],
              },
            ],
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

      // Get test group results for processing
      const testGroupResults = await db.test_group_result.findAll({
        where: { medical_report_id: req.params.id },
        attributes: ["id", "test_group_id", "tg_component_id", "result_json"],
      });

      // Process test groups to include proper values structure
      const reportData = report.get({ plain: true });

      // Transform medical_report_has_tgs to include processed values
      if (reportData.medical_report_has_tgs) {
        reportData.test_group_results = reportData.medical_report_has_tgs
          .filter((rtg) => rtg.test_group)
          .map((rtg) => {
            const group = rtg.test_group;

            // Create field name to ID mapping
            const fieldNameToIdMap = {};
            (group.tg_fields || []).forEach((field) => {
              fieldNameToIdMap[field.name] = field.id;
            });

            // Process test group results for this group
            const valueMap = {};
            const groupResults = testGroupResults.filter(
              (tgr) => tgr.test_group_id === group.id
            );

            groupResults.forEach((tgr) => {
              let resultJson = tgr.result_json;

              // Parse JSON string if needed
              if (typeof resultJson === "string") {
                try {
                  resultJson = JSON.parse(resultJson);
                } catch (parseError) {
                  console.error(
                    `Failed to parse JSON for component ${tgr.tg_component_id}:`,
                    parseError.message
                  );
                  resultJson = null;
                }
              }

              if (resultJson && typeof resultJson === "object") {
                const componentValues = {};

                // Convert field names back to field IDs
                Object.entries(resultJson).forEach(([fieldName, value]) => {
                  const fieldId = fieldNameToIdMap[fieldName];

                  if (
                    value !== null &&
                    value !== undefined &&
                    value.toString().trim() !== ""
                  ) {
                    if (fieldId) {
                      componentValues[fieldId] = value;
                    } else {
                      // Handle legacy field_X format
                      const legacyMatch = fieldName.match(/^field_(\d+)$/);
                      if (legacyMatch) {
                        componentValues[legacyMatch[1]] = value;
                      }
                    }
                  }
                });

                if (Object.keys(componentValues).length > 0) {
                  valueMap[tgr.tg_component_id] = componentValues;
                }
              }
            });

            // Map field_comp_options
            const fieldCompOptions = (group.field_comp_options || []).map(
              (opt) => ({
                id: opt.id,
                name: opt.name,
                tg_component_id: opt.tg_component_id,
                tg_fields_id: opt.tg_fields_id,
                test_group_id: opt.test_group_id,
              })
            );

            // Direct components
            const directComponents = (group.tg_components || [])
              .filter((comp) => comp.test_category_id == null)
              .map((comp) => ({
                id: comp.id,
                name: comp.name,
                category: null,
              }));

            // Categories and their components
            const categories = (group.tgc_categories || []).map((cat) => ({
              id: cat.id,
              name: cat.name,
              components: (cat.tg_components || []).map((comp) => ({
                id: comp.id,
                name: comp.name,
                category: cat.name,
              })),
            }));

            // All fields
            const fields = (group.tg_fields || []).map((field) => ({
              id: field.id,
              name: field.name,
              field_comp_options: fieldCompOptions
                .filter((opt) => opt.tg_fields_id === field.id)
                .map((opt) => ({
                  id: opt.id,
                  name: opt.name,
                  tg_component_id: opt.tg_component_id,
                  tg_fields_id: opt.tg_fields_id,
                })),
            }));

            return {
              id: group.id,
              name: group.name,
              directComponents,
              categories,
              fields,
              values: valueMap,
              test_group_results: testGroupResults.filter(
                (tgr) => tgr.test_group_id === group.id
              ),
            };
          });

        // Remove the raw medical_report_has_tgs from response
        delete reportData.medical_report_has_tgs;
      }

      const enrichedReport = {
        ...reportData,
        tests_count: reportData.tests?.length || 0,
        cultures_count: reportData.medical_report_has_cultures?.length || 0,
        test_groups_count: reportData.test_group_results?.length || 0,
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
  async (req, res) => {
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

      // Associate cultures if provided
      if (culture_ids && culture_ids.length > 0) {
        await report.setCultures(culture_ids);
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
            model: db.culture,
            as: "cultures",
            through: {
              model: db.medical_report_has_culture,
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
  async (req, res) => {
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
        reported_at,
      } = req.body;

      const report = await db.medical_report.findByPk(req.params.id);

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

      // Update culture results if provided
      if (culture_results) {
        for (const cultureResult of culture_results) {
          // First, find the medical_report_has_culture record
          const cultureRecord = await db.medical_report_has_culture.findOne({
            where: {
              medical_report_id: report.id,
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
                  medical_report_id: report.id,
                  culture_id: cultureResult.culture_id,
                },
              }
            );
          }
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
            model: db.culture,
            as: "cultures",
            through: {
              model: db.medical_report_has_culture,
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
  async (req, res) => {
    try {
      const report = await db.medical_report.findByPk(req.params.id);

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
      const testComponents = await db.test_component.findAll({
        where: { test_id: req.params.testId },
        attributes: [
          "id",
          "name",
          "unit",
          "normal_from",
          "normal_to",
          "gender",
          "age_start",
          "age_end",
        ],
      });

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
          const testComponents = await db.test_component.findAll({
            where: { test_id: testResult.test_id },
          });

          // For now, we'll use the first component's normal range
          // In a more complex system, you might want to handle multiple components per test
          const normalRange =
            testComponents.length > 0
              ? `${testComponents[0].normal_from} - ${testComponents[0].normal_to}`
              : null;
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
            model: db.culture,
            as: "cultures",
            through: {
              model: db.medical_report_has_culture,
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

// old Optimized endpoint: Get all data needed for results entry in one call
// router.get(
//   "/:id/results-data",
//   authenticateUser,
//   authorizeRoles("admin", "chemist", "receptionist"),
//   async (req, res) => {
//     try {
//       // Get the medical report with all necessary data in one query
//       const report = await db.medical_report.findByPk(req.params.id, {
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
//           {
//             model: db.test,
//             as: "tests",
//             through: { attributes: ["result", "status"] },
//             include: [
//               {
//                 model: db.test_component,
//                 as: "components",
//                 attributes: [
//                   "id",
//                   "name",
//                   "unit",
//                   "normal_from",
//                   "normal_to",
//                   "c_low",
//                   "c_high",
//                   "gender",
//                   "age_start",
//                   "age_end",
//                   "reference_range",
//                   "result_type",
//                 ],
//               },
//             ],
//           },
//           {
//             model: db.medical_report_has_culture,
//             as: "medical_report_has_cultures",
//             include: [
//               {
//                 model: db.culture,
//                 as: "culture",
//                 attributes: [
//                   "id",
//                   "name",
//                   "price",
//                   "sample_type_id",
//                   "category_id",
//                 ],
//               },
//               {
//                 model: db.medical_report_has_culture_antibiotic,
//                 as: "culture_antibiotics",
//                 include: [
//                   {
//                     model: db.antibiotic,
//                     as: "antibiotic",
//                     attributes: ["id", "name", "shortcut", "commercial_name"],
//                   },
//                 ],
//               },
//               {
//                 model: db.medical_report_culture_result,
//                 as: "culture_results",
//                 attributes: [
//                   "id",
//                   "culture_option_name",
//                   "culture_sub_option_name",
//                   "custom_result",
//                   "result_type",
//                   "created_at",
//                   "updated_at",
//                 ],
//               },
//             ],
//           },
//           {
//             model: db.test_group_result,
//             as: "test_group_results",
//             required: false, // keep results even if children missing
//             attributes: ["id", "result_json"],
//             include: [
//               {
//                 model: db.test_group,
//                 as: "test_group",
//                 attributes: ["id", "name"],
//                 required: false,
//               },
//               {
//                 model: db.tg_component,
//                 as: "tg_component",
//                 attributes: ["id", "name", "reference_range", "result_type"],
//                 required: false,
//                 include: [
//                   {
//                     model: db.tgc_category,
//                     as: "category",
//                     attributes: ["id", "name"],
//                     required: false,
//                   },
//                 ],
//               },
//             ],
//           }
//         ],
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
//       });

//       if (!report) {
//         return res.status(404).json({ error: "Medical report not found" });
//       }

//       // convert to plain object so we can modify keys
//       const reportData = report.get({ plain: true });

//       // rename the key
//       reportData.cultures = reportData.medical_report_has_cultures;
//       delete reportData.medical_report_has_cultures;
//       reportData.test_group_results = reportData.test_group_results.map(r => ({
//   ...r,
//   results: r.result_json,
//   result_json: undefined
//       }));
//       // add test groups to the report effectively
//       reportData.test_groups = report.test_group_results.map(r => r.test_group);


//       res.json(reportData);
//     } catch (error) {
//       console.error("Error fetching comprehensive results data:", error);
//       res.status(500).json({
//         error: "Failed to fetch results data",
//         details:
//           process.env.NODE_ENV === "development" ? error.message : undefined,
//       });
//     }
//   }
// );
router.get(
  "/:id/results-data",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const reportId = req.params.id;

      /** -----------------------------
       * 1. Fetch the base medical report
       * ----------------------------- */
      const report = await db.medical_report.findByPk(reportId, {
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
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      const reportData = report.get({ plain: true });

      /** -----------------------------
       * 2. Fetch related tests
       * ----------------------------- */
      const testIds = await db.medical_report_has_test.findAll({
        attributes: ["test_id"],
        where: { medical_report_id: reportId },
        raw: true,
      });

      const tests = await db.test.findAll({
        where: { id: testIds.map((t) => t.test_id) },
        include: [
          {
            model: db.test_component,
            as: "components",
            attributes: [
              "id",
              "name",
              "unit",
              "normal_from",
              "normal_to",
              "c_low",
              "c_high",
              "gender",
              "age_start",
              "age_end",
              "reference_range",
              "result_type",
            ],
          },
        ],
      });

      // Fetch test-level junction (result/status) and component-level results
      const [testJunctionRows, componentResults] = await Promise.all([
        db.medical_report_has_test.findAll({
          where: { medical_report_id: reportId },
          attributes: ["test_id", "result", "status"],
          raw: true,
        }),
        db.medical_report_test_component_result.findAll({
          where: { medical_report_id: reportId },
          attributes: ["test_id", "test_component_id", "result", "status"],
          raw: true,
        }),
      ]);

      // Map of test_id -> { result, status }
      const testJunctionMap = {};
      testJunctionRows.forEach((row) => {
        testJunctionMap[row.test_id] = {
          result: row.result,
          status: row.status,
        };
      });

      // Map of test_id -> [ { test_component_id, result, status } ]
      const testComponentResultsMap = {};
      componentResults.forEach((row) => {
        if (!testComponentResultsMap[row.test_id]) {
          testComponentResultsMap[row.test_id] = [];
        }
        testComponentResultsMap[row.test_id].push({
          test_component_id: row.test_component_id,
          result: row.result,
          status: row.status,
        });
      });

      /** -----------------------------
       * 3. Fetch related cultures
       * ----------------------------- */
      const cultures = await db.medical_report_has_culture.findAll({
        where: { medical_report_id: reportId },
        include: [
          {
            model: db.culture,
            as: "culture",
            attributes: ["id", "name", "price", "sample_type_id", "category_id"],
          },
          {
            model: db.medical_report_has_culture_antibiotic,
            as: "culture_antibiotics",
            include: [
              {
                model: db.antibiotic,
                as: "antibiotic",
                attributes: ["id", "name", "shortcut", "commercial_name"],
              },
            ],
          },
          {
            model: db.medical_report_culture_result,
            as: "culture_results",
            attributes: [
              "id",
              "culture_option_name",
              "culture_sub_option_name",
              "custom_result",
              "result_type",
              "created_at",
              "updated_at",
            ],
          },
        ],
      });

      /** -----------------------------
       * 4. Fetch test group results
       * ----------------------------- */
      const testGroupResults = await db.test_group_result.findAll({
        where: { medical_report_id: reportId },
        attributes: ["id", "result_json"],
        include: [
          {
            model: db.test_group,
            as: "test_group",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.tg_component,
            as: "tg_component",
            attributes: ["id", "name", "reference_range", "result_type"],
            required: false,
            include: [
              {
                model: db.tgc_category,
                as: "category",
                attributes: ["id", "name"],
                required: false,
              },
            ],
          },
        ],
      });

      /** -----------------------------
       * 5. Assemble final response
       * ----------------------------- */
      // Attach junction result/status to each test
      const testsPlain = tests.map((t) => {
        const plain = t.get({ plain: true });
        const j = testJunctionMap[plain.id];
        if (j) {
          plain.medical_report_has_test = { result: j.result, status: j.status };
        }
        // Optionally embed component results directly for convenience
        const perTestResults = testComponentResultsMap[plain.id] || [];
        if (perTestResults.length > 0 && Array.isArray(plain.components)) {
          const resultByCompId = {};
          perTestResults.forEach((r) => {
            resultByCompId[r.test_component_id] = { result: r.result, status: r.status };
          });
          plain.components = plain.components.map((c) => ({
            ...c,
            // This mirrors the old structure from "/:id" so the client can prefill seamlessly
            results: resultByCompId[c.id] ? [ { id: undefined, result: resultByCompId[c.id].result, status: resultByCompId[c.id].status } ] : [],
          }));
        }
        return plain;
      });

      reportData.tests = testsPlain;

      reportData.cultures = cultures.map((c) => c.get({ plain: true }));

      reportData.test_group_results = testGroupResults.map((r) => ({
        ...r.get({ plain: true }),
        results: r.result_json,
        result_json: undefined,
      }));

      reportData.test_groups = [
        ...new Map(
          testGroupResults
            .filter((r) => r.test_group) // avoid nulls
            .map((r) => [r.test_group.id, r.test_group])
        ).values(),
      ];

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

// Get test groups for a medical report
router.get(
  "/:id/test-groups",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      // First get all test groups associated with this medical report through the junction table
      // Include soft-deleted test groups for existing medical reports to preserve data
      const reportTestGroups = await db.medical_report_has_tg.findAll({
        where: { medical_report_id: req.params.id },
        attributes: ["medical_report_id", "test_group_id", "value"],
        include: [
          {
            model: db.test_group,
            as: "test_group",
            required: false, // Make this a LEFT JOIN
            paranoid: false, // Include soft-deleted test groups
            attributes: ["id", "name", "price", "deleted_at"],
            include: [
              {
                model: db.tg_component,
                as: "tg_components",
                required: false,
                paranoid: false,
                attributes: ["id", "test_group_id", "test_category_id", "name"],
              },
              {
                model: db.tgc_category,
                as: "tgc_categories",
                required: false,
                paranoid: false,
                attributes: ["id", "name", "test_group_id"],
                include: [
                  {
                    model: db.tg_component,
                    as: "tg_components",
                    required: false,
                    paranoid: false,
                    attributes: [
                      "id",
                      "test_group_id",
                      "test_category_id",
                      "name",
                    ],
                  },
                ],
              },
              {
                model: db.tg_fields,
                as: "tg_fields",
                required: false,
                paranoid: false,
                attributes: ["id", "name", "test_group_id"],
              },
              {
                model: db.field_comp_options,
                as: "field_comp_options",
                required: false,
                paranoid: false,
                attributes: [
                  "id",
                  "name",
                  "tg_component_id",
                  "tg_fields_id",
                  "test_group_id",
                ],
              },
            ],
          },
        ],
      });

      // Debug log to see raw data
      console.log(
        "Raw reportTestGroups:",
        JSON.stringify(reportTestGroups, null, 2)
      );

      // Get all test group results for this medical report using the new JSON structure
      const testGroupResults = await db.test_group_result.findAll({
        where: { medical_report_id: req.params.id },
        attributes: ["id", "test_group_id", "tg_component_id", "result_json"],
      });

      console.log(
        `DEBUG: Found ${testGroupResults.length} test group results for medical report ${req.params.id}:`
      );
      testGroupResults.forEach((tgr, index) => {
        console.log(`  Result ${index + 1}:`, {
          id: tgr.id,
          test_group_id: tgr.test_group_id,
          tg_component_id: tgr.tg_component_id,
          result_json: tgr.result_json,
          result_json_type: typeof tgr.result_json,
        });
      });

      // Format the response
      const testGroups = reportTestGroups
        .filter((rtg) => rtg.test_group) // Only include entries where test_group exists
        .map((rtg) => {
          const group = rtg.test_group;

          // Create a map of field name to field ID for this test group
          const fieldNameToIdMap = {};
          (group.tg_fields || []).forEach((field) => {
            fieldNameToIdMap[field.name] = field.id; // Keep as number for frontend compatibility
          });

          // Create a map of component_id -> field_id -> value from JSON results
          const valueMap = {};
          const groupResults = testGroupResults.filter(
            (tgr) => tgr.test_group_id === group.id
          );

          console.log(
            `DEBUG: Processing test group ${group.id} (${group.name}):`
          );
          console.log(`  Found ${groupResults.length} results for this group`);
          console.log(`  Field name to ID mapping:`, fieldNameToIdMap);

          groupResults.forEach((tgr) => {
            console.log(
              `  Processing result for component ${tgr.tg_component_id}:`,
              {
                result_json: tgr.result_json,
                result_json_type: typeof tgr.result_json,
              }
            );

            // Extract field values from JSON and convert field names back to field IDs
            let resultJson = tgr.result_json;

            // Parse JSON string if needed
            if (typeof resultJson === "string") {
              try {
                resultJson = JSON.parse(resultJson);
                console.log(
                  `    Parsed JSON string for component ${tgr.tg_component_id}:`,
                  resultJson
                );
              } catch (parseError) {
                console.error(
                  `    Failed to parse JSON for component ${tgr.tg_component_id}:`,
                  parseError.message
                );
                resultJson = null;
              }
            }

            if (resultJson && typeof resultJson === "object") {
              const componentValues = {};

              // Convert field names back to field IDs for frontend compatibility
              Object.entries(resultJson).forEach(([fieldName, value]) => {
                const fieldId = fieldNameToIdMap[fieldName];
                console.log(
                  `    Converting field '${fieldName}' -> ID '${fieldId}' with value:`,
                  value
                );

                // Only include non-empty values
                if (
                  value !== null &&
                  value !== undefined &&
                  value.toString().trim() !== ""
                ) {
                  if (fieldId) {
                    componentValues[fieldId] = value;
                  } else {
                    // Handle legacy field_X format or unknown fields
                    const legacyMatch = fieldName.match(/^field_(\d+)$/);
                    if (legacyMatch) {
                      componentValues[legacyMatch[1]] = value;
                      console.log(
                        `    Using legacy format: field_${legacyMatch[1]} = ${value}`
                      );
                    } else {
                      console.warn(
                        `Unknown field name: ${fieldName} for test group ${group.id}`
                      );
                    }
                  }
                } else {
                  console.log(
                    `    Skipping empty value for field '${fieldName}'`
                  );
                }
              });

              // Only add to valueMap if there are actual values
              if (Object.keys(componentValues).length > 0) {
                valueMap[tgr.tg_component_id] = componentValues;
                console.log(
                  `    Final component values for component ${tgr.tg_component_id}:`,
                  componentValues
                );
              } else {
                console.log(
                  `    No values to store for component ${tgr.tg_component_id}`
                );
              }
            }
          });

          console.log(`  Final valueMap for group ${group.id}:`, valueMap);

          // Map field_comp_options to include in the response
          const fieldCompOptions = (group.field_comp_options || []).map(
            (opt) => ({
              id: opt.id,
              name: opt.name,
              tg_component_id: opt.tg_component_id,
              tg_fields_id: opt.tg_fields_id,
              test_group_id: opt.test_group_id,
            })
          );

          // Direct components: those with test_category_id == null
          const direct_components = (group.tg_components || [])
            .filter((comp) => comp.test_category_id == null)
            .map((comp) => ({
              id: comp.id,
              name: comp.name,
              category: null,
            }));

          // Categories and their components
          const categories = (group.tgc_categories || []).map((cat) => ({
            id: cat.id,
            name: cat.name,
            components: (cat.tg_components || []).map((comp) => ({
              id: comp.id,
              name: comp.name,
              category: cat.name,
            })),
          }));

          // All fields
          const fields = (group.tg_fields || []).map((field) => ({
            id: field.id,
            name: field.name,
            field_comp_options: fieldCompOptions
              .filter((opt) => opt.tg_fields_id === field.id)
              .map((opt) => ({
                id: opt.id,
                name: opt.name,
                tg_component_id: opt.tg_component_id,
                tg_fields_id: opt.tg_fields_id,
              })),
          }));

          return {
            id: group.id,
            name: group.name,
            direct_components,
            categories,
            fields,
            values: valueMap,
          };
        });

      // Verify the medical report exists
      const report = await db.medical_report.findByPk(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      res.json(testGroups);
    } catch (error) {
      console.error("Error fetching test groups for report:", error);
      res.status(500).json({
        error: "Failed to fetch test groups",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);
// Helper function to save test group values with retry on deadlock
/**
 * Save test group values using the new simplified JSON structure
 * @param {number} medical_report_id - ID of the medical report
 * @param {number} test_group_id - ID of the test group
 * @param {Object} values - Values object with structure: { component_id: { field_id: value } }
 * @param {number} maxRetries - Maximum number of retry attempts for deadlock handling
 * @returns {Promise<Object>} Success result
 */
async function saveTestGroupValuesWithRetry(
  medical_report_id,
  test_group_id,
  values,
  externalTransaction = null,
  maxRetries = 3
) {
  let retryCount = 0;
  let lastError;

  while (retryCount < maxRetries) {
    const t = externalTransaction || (await db.sequelize.transaction());
    try {
      // Validate that the medical report exists
      const report = await db.medical_report.findByPk(medical_report_id, {
        transaction: t,
      });
      if (!report) {
        const error = new Error(
          `Medical report with ID ${medical_report_id} not found`
        );
        error.status = 404;
        throw error;
      }

      // Validate that the test group exists
      const testGroup = await db.test_group.findByPk(test_group_id, {
        transaction: t,
      });
      if (!testGroup) {
        const error = new Error(
          `Test group with ID ${test_group_id} not found`
        );
        error.status = 404;
        throw error;
      }

      // Prepare operations for the new JSON-based structure
      const operations = [];

      // First, get all field information for this test group to map field IDs to field names
      const testGroupFields = await db.tg_fields.findAll({
        where: {
          test_group_id: parseInt(test_group_id, 10),
          deleted_at: null, // Only get active fields
        },
        attributes: ["id", "name"],
        transaction: t,
      });

      // Create a map of field ID to field name for quick lookup
      const fieldIdToNameMap = {};
      testGroupFields.forEach((field) => {
        fieldIdToNameMap[field.id.toString()] = field.name;
      });

      console.log("Field ID to Name mapping:", fieldIdToNameMap);

      // Convert values object to test_group_result records with JSON storage
      Object.entries(values).forEach(([component_id, fields]) => {
        if (!component_id) {
          console.warn("Skipping empty component_id");
          return;
        }

        // Create a single record per component with all field values as JSON
        const result_json = {};
        let hasNonEmptyValues = false;

        Object.entries(fields).forEach(([field_id, value]) => {
          if (!field_id) {
            console.warn(
              "Skipping empty field_id for component:",
              component_id
            );
            return;
          }

          // Only store non-empty values to prevent saving empty strings
          if (
            value !== null &&
            value !== undefined &&
            value.toString().trim() !== ""
          ) {
            // Convert field ID to field name for better JSON structure
            const fieldName = fieldIdToNameMap[field_id] || `field_${field_id}`;

            // Store field values in JSON format using field names as keys
            result_json[fieldName] = value;
            hasNonEmptyValues = true;
          }
        });

        // Only create operation if there are non-empty field values
        if (hasNonEmptyValues) {
          operations.push({
            medical_report_id: parseInt(medical_report_id, 10),
            test_group_id: parseInt(test_group_id, 10),
            tg_component_id: parseInt(component_id, 10),
            result_json: result_json,
          });
        }
      });

      console.log("Prepared operations for new structure:", operations);

      // Delete existing test_group_result records for this report and test group
      const deleteResult = await db.test_group_result.destroy({
        where: {
          medical_report_id: parseInt(medical_report_id, 10),
          test_group_id: parseInt(test_group_id, 10),
        },
        transaction: t,
      });
      console.log(`Deleted ${deleteResult} existing test_group_result records`);

      // Insert new test_group_result records if there are any
      if (operations.length > 0) {
        console.log("Inserting new test_group_result records...");
        await db.test_group_result.bulkCreate(operations, {
          transaction: t,
          updateOnDuplicate: ["result_json"],
          validate: true,
          individualHooks: true,
        });
        console.log("Successfully inserted new test_group_result records");
      } else {
        console.log("No test_group_result records to insert");
      }

      // Only commit if we created the transaction ourselves
      if (!externalTransaction) {
        await t.commit();
        console.log("Transaction committed successfully");
      }
      return { success: true };
    } catch (error) {
      // Only rollback if we created the transaction ourselves
      if (!externalTransaction && t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
      }

      // If this is a deadlock and we have retries left, try again
      if (
        (error.original?.code === "ER_LOCK_DEADLOCK" ||
          error.name === "SequelizeDatabaseError") &&
        retryCount < maxRetries - 1
      ) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 100; // Exponential backoff
        console.warn(
          `Deadlock detected, retrying (${retryCount}/${maxRetries}) after ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If we get here, either it's not a deadlock or we're out of retries
      lastError = error;
      throw error;
    }
  }

  throw (
    lastError ||
    new Error("Failed to save test group values after multiple attempts")
  );
}

// Save test group values for a medical report
router.post(
  "/:id/test-groups",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const { test_group_id, values } = req.body;
      const medical_report_id = req.params.id;

      console.log("Received request to save test group values:", {
        medical_report_id,
        test_group_id,
        values,
      });

      // Validate required fields
      if (!test_group_id || values === undefined) {
        return res.status(400).json({
          error:
            "Missing required fields: test_group_id and values are required",
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
      console.error("Error in save test group values endpoint:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...(error.errors && { errors: error.errors }),
        ...(error.fields && { fields: error.fields }),
      });

      const status = error.status || 500;
      const message = error.message || "Failed to save test group values";

      res.status(status).json({
        error: message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// Update medical report to include test group count
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const reports = await db.medical_report.findAll({
        include: [
          // ... existing includes ...
          {
            model: db.test_group,
            as: "test_groups",
            through: { attributes: [] },
            attributes: [],
          },
        ],
        attributes: {
          include: [
            [
              db.sequelize.fn("COUNT", db.sequelize.col("test_groups.id")),
              "test_groups_count",
            ],
          ],
        },
        group: ["medical_report.id"],
      });

      // ... rest of the existing code ...
      const reportsWithPatientName = reports.map((report) => {
        const reportData = report.get({ plain: true });
        return {
          ...reportData,
          patient_name: reportData.patient?.name || "Unknown Patient",
          tests: reportData.tests || [],
          cultures: reportData.cultures || [],
          tests_count: reportData.tests ? reportData.tests.length : 0,
          cultures_count: reportData.cultures ? reportData.cultures.length : 0,
          test_groups_count: reportData.test_groups
            ? reportData.test_groups.length
            : 0,
          invoice_id: reportData.bill?.id || null,
        };
      });
      // ... rest of the existing code ...
    } catch (error) {
      console.error("Error fetching medical reports:", error);
      res.status(500).json({ error: "Failed to fetch medical reports" });
    }
  }
);

// Save test result
router.post(
  "/:reportId/tests/:testId/result",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { reportId, testId } = req.params;
      const { result, status = "pending" } = req.body;

      console.log(`Attempting to save test result:`, {
        reportId,
        testId,
        result,
        status,
      });

      // First, verify the medical report exists
      const medicalReport = await db.medical_report.findByPk(reportId, {
        transaction: t,
      });
      if (!medicalReport) {
        if (t && !t.finished) {
          try {
            await t.rollback();
          } catch (rollbackError) {
            console.error("Error rolling back transaction:", rollbackError);
          }
        }
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Verify the test exists
      const test = await db.test.findByPk(testId, { transaction: t });
      if (!test) {
        if (t && !t.finished) {
          try {
            await t.rollback();
          } catch (rollbackError) {
            console.error("Error rolling back transaction:", rollbackError);
          }
        }
        return res.status(404).json({ error: "Test not found" });
      }

      // Find the medical report test entry
      const reportTest = await db.medical_report_has_test.findOne({
        where: {
          medical_report_id: reportId,
          test_id: testId,
        },
        transaction: t,
      });

      if (!reportTest) {
        if (t && !t.finished) {
          try {
            await t.rollback();
          } catch (rollbackError) {
            console.error("Error rolling back transaction:", rollbackError);
          }
        }

        // Provide more detailed error information
        const allTestsInReport = await db.medical_report_has_test.findAll({
          where: { medical_report_id: reportId },
          attributes: ["test_id"],
          transaction: t,
        });

        console.error(
          `Test association not found. Medical report ${reportId} has ${allTestsInReport.length} tests:`,
          allTestsInReport.map((t) => t.test_id)
        );

        return res.status(404).json({
          error: "Test not found in this medical report",
          details: {
            medicalReportId: reportId,
            testId: testId,
            availableTests: allTestsInReport.map((t) => t.test_id),
            testName: test.name,
            medicalReportDate: medicalReport.date,
          },
        });
      }

      // Calculate status based on result and test normal range
      let calculatedStatus = status || "pending";
      
      if (result !== null && result !== undefined && result !== "") {
        const numericResult = Number(result);
        if (!isNaN(numericResult)) {
          // Fetch test details to get normal range
          const testDetails = await db.test.findByPk(testId, {
            attributes: ['normal_from', 'normal_to', 'c_low', 'c_high'],
            transaction: t,
          });
          
          if (testDetails && testDetails.normal_from !== null && testDetails.normal_to !== null) {
            if (numericResult < testDetails.normal_from) {
              calculatedStatus = testDetails.c_low !== null && numericResult < testDetails.c_low
                ? "critical low"
                : "low";
            } else if (numericResult > testDetails.normal_to) {
              calculatedStatus = testDetails.c_high !== null && numericResult > testDetails.c_high
                ? "critical high"
                : "high";
            } else {
              calculatedStatus = "normal";
            }
          } else {
            calculatedStatus = "done";
          }
        } else {
          calculatedStatus = "done";
        }
      }

      // Update the test result
      await db.medical_report_has_test.update(
        {
          result: result || null,
          status: calculatedStatus,
          updatedAt: new Date(),
        },
        {
          where: {
            medical_report_id: reportId,
            test_id: testId,
          },
          transaction: t,
        }
      );

      // Update received_at date when first test result is entered
      const resultStr =
        result !== null && result !== undefined ? String(result) : "";
      if (resultStr.trim()) {
        await updateMedicalReportDates(reportId, "received", t);
      }

      await t.commit();
      console.log(
        `Successfully saved test result for medical report ${reportId}, test ${testId}`
      );
      res.json({ success: true });
    } catch (error) {
      if (t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
      }
      console.error("Error saving test result:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      res.status(500).json({ error: "Failed to save test result" });
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

// Save test component results (for tests with multiple components)
router.post(
  "/:reportId/tests/:testId/component-results",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const { reportId, testId } = req.params;
      const { component_results } = req.body; // Array of {test_component_id, result, status}

      console.log(`Attempting to save test component results:`, {
        reportId,
        testId,
        component_results,
        requestBody: req.body,
      });

      // Validate input
      if (!component_results || !Array.isArray(component_results)) {
        console.error("Invalid component_results:", component_results);
        return res.status(400).json({
          error: "component_results must be provided as an array",
        });
      }

      if (component_results.length === 0) {
        console.error("Empty component_results array");
        return res.status(400).json({
          error: "component_results array cannot be empty",
        });
      }

      // Execute the entire operation with deadlock retry logic
      const result = await executeWithDeadlockRetry(async () => {
        const t = await db.sequelize.transaction();
        try {
          // Verify the medical report exists
          const medicalReport = await db.medical_report.findByPk(reportId, {
            transaction: t,
          });
          if (!medicalReport) {
            await t.rollback();
            return { error: "Medical report not found", status: 404 };
          }

          // Verify the test exists and is associated with the medical report
          const testAssociation = await db.medical_report_has_test.findOne({
            where: {
              medical_report_id: reportId,
              test_id: testId,
            },
            transaction: t,
          });

          if (!testAssociation) {
            await t.rollback();
            return {
              error: "Test not found in this medical report",
              status: 404,
            };
          }

          // Get test components for validation
          const testComponents = await db.test_component.findAll({
            where: { test_id: testId },
            transaction: t,
          });

          const validComponentIds = testComponents.map((tc) => tc.id);

          console.log(`Test ${testId} validation:`, {
            testComponentsFound: testComponents.length,
            validComponentIds: validComponentIds,
            receivedComponentResults: component_results.map((cr) => ({
              test_component_id: cr.test_component_id,
              result: cr.result,
            })),
          });

          // Extra debugging for test 7
          if (testId == 7) {
            console.log(`EXTRA DEBUG for test 7:`, {
              testComponents: testComponents.map((tc) => ({
                id: tc.id,
                name: tc.name,
              })),
              component_results: component_results,
            });
          }

          // Process each component result
          for (let i = 0; i < component_results.length; i++) {
            try {
              const componentResult = component_results[i];
              console.log(
                `Processing component result ${i + 1}/${
                  component_results.length
                } for test ${testId}:`,
                componentResult
              );

              const { test_component_id, result, status } = componentResult;

              // Validate component result structure
              if (!componentResult.hasOwnProperty("test_component_id")) {
                await t.rollback();
                return {
                  error: "Each component result must have test_component_id",
                  status: 400,
                };
              }

              if (
                typeof test_component_id !== "number" ||
                isNaN(test_component_id)
              ) {
                await t.rollback();
                return {
                  error: `test_component_id must be a valid number, received: ${test_component_id}`,
                  status: 400,
                };
              }

              // Validate component belongs to the test
              if (!validComponentIds.includes(test_component_id)) {
                await t.rollback();
                return {
                  error: `Test component ${test_component_id} does not belong to test ${testId}. Valid component IDs: ${validComponentIds.join(
                    ", "
                  )}`,
                  status: 400,
                };
              }

              // Calculate status based on result and component normal range
              const component = testComponents.find(
                (tc) => tc.id === test_component_id
              );
              let calculatedStatus = status || "pending";

              if (result !== null && result !== undefined && result !== "") {
                const numericResult = Number(result);
                if (!isNaN(numericResult) && component) {
                  if (
                    component.normal_from !== null &&
                    component.normal_to !== null
                  ) {
                    if (numericResult < component.normal_from) {
                      calculatedStatus =
                        component.c_low !== null &&
                        numericResult < component.c_low
                          ? "critical low"
                          : "low";
                    } else if (numericResult > component.normal_to) {
                      calculatedStatus =
                        component.c_high !== null &&
                        numericResult > component.c_high
                          ? "critical high"
                          : "high";
                    } else {
                      calculatedStatus = "normal";
                    }
                  } else {
                    calculatedStatus = "done";
                  }
                }
              }

              // Extra debugging for test 7 before upsert
              if (testId == 7) {
                console.log(
                  `EXTRA DEBUG - About to upsert component ${test_component_id}:`,
                  {
                    medical_report_id: reportId,
                    test_id: testId,
                    test_component_id,
                    result: result || null,
                    status: calculatedStatus,
                    originalResult: result,
                    resultType: typeof result,
                    resultLength: result ? result.length : "N/A",
                  }
                );
              }

              // Upsert the component result
              try {
                const upsertResult =
                  await db.medical_report_test_component_result.upsert(
                    {
                      medical_report_id: parseInt(reportId),
                      test_id: parseInt(testId),
                      test_component_id: parseInt(test_component_id),
                      result: result || null,
                      status: calculatedStatus,
                    },
                    {
                      transaction: t,
                    }
                  );

                if (testId == 7) {
                  console.log(
                    `EXTRA DEBUG - Upsert successful for component ${test_component_id}:`,
                    {
                      upsertResult: upsertResult ? "Success" : "Failed",
                      created: upsertResult ? upsertResult[1] : "Unknown",
                    }
                  );
                }
              } catch (upsertError) {
                console.error(
                  `UPSERT ERROR for test ${testId}, component ${test_component_id}:`,
                  {
                    error: upsertError.message,
                    code: upsertError.code,
                    sql: upsertError.sql,
                    stack: upsertError.stack,
                  }
                );
                throw upsertError;
              }

              console.log(
                `Successfully processed component ${test_component_id} for test ${testId}`
              );
            } catch (componentError) {
              console.error(
                `Error processing component result ${
                  i + 1
                } for test ${testId}:`,
                componentError
              );
              await t.rollback();
              return {
                error: `Error processing component result: ${componentError.message}`,
                status: 500,
              };
            }
          }

          // Update the main test status based on component results
          const allComponentResults =
            await db.medical_report_test_component_result.findAll({
              where: {
                medical_report_id: reportId,
                test_id: testId,
              },
              transaction: t,
            });

          // Determine overall test status
          let overallStatus = "pending";
          if (allComponentResults.length > 0) {
            const statuses = allComponentResults.map((cr) => cr.status);
            if (
              statuses.includes("critical high") ||
              statuses.includes("critical low")
            ) {
              overallStatus = statuses.includes("critical high")
                ? "critical high"
                : "critical low";
            } else if (statuses.includes("high") || statuses.includes("low")) {
              overallStatus = statuses.includes("high") ? "high" : "low";
            } else if (statuses.includes("abnormal")) {
              overallStatus = "abnormal";
            } else if (statuses.every((s) => s === "normal" || s === "done")) {
              overallStatus = "normal";
            } else if (statuses.some((s) => s === "done")) {
              overallStatus = "done";
            }
          }

          // Update the main test result (could be average, concatenated, or null)
          await db.medical_report_has_test.update(
            {
              status: overallStatus,
              result: null, // For multi-component tests, we don't store a single result
            },
            {
              where: {
                medical_report_id: reportId,
                test_id: testId,
              },
              transaction: t,
            }
          );

          // Update received_at date when first component result is entered
          const hasResults = allComponentResults.some(
            (cr) => cr.result !== null && cr.result !== ""
          );
          if (hasResults) {
            await updateMedicalReportDates(reportId, "received", t);
          }

          await t.commit();
          console.log(
            `Successfully saved test component results for medical report ${reportId}, test ${testId}`
          );
          return { success: true };
        } catch (error) {
          if (t && !t.finished) {
            try {
              await t.rollback();
            } catch (rollbackError) {
              console.error("Error rolling back transaction:", rollbackError);
            }
          }
          throw error;
        }
      });

      // Handle the result
      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error("Error saving test component results:", error);
      res.status(500).json({ error: "Failed to save test component results" });
    }
  }
);

// Get test component results for a specific test in a medical report
router.get(
  "/:reportId/tests/:testId/component-results",
  authenticateUser,
  async (req, res) => {
    try {
      const { reportId, testId } = req.params;

      const componentResults =
        await db.medical_report_test_component_result.findAll({
          where: {
            medical_report_id: reportId,
            test_id: testId,
          },
          include: [
            {
              model: db.test_component,
              as: "test_component",
              attributes: [
                "id",
                "name",
                "unit",
                "normal_from",
                "normal_to",
                "reference_range",
                "result_type",
                "gender",
                "age_start",
                "age_end",
              ],
            },
          ],
          order: [["test_component_id", "ASC"]],
        });

      res.json(componentResults);
    } catch (error) {
      console.error("Error fetching test component results:", error);
      res.status(500).json({ error: "Failed to fetch test component results" });
    }
  }
);

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

// Save culture result
router.post(
  "/:reportId/cultures/:cultureId/result",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { reportId, cultureId } = req.params;
      const { result, status = "pending" } = req.body;

      console.log(`Attempting to save culture result:`, {
        reportId,
        cultureId,
        result,
        status,
      });

      // First, verify the medical report exists
      const medicalReport = await db.medical_report.findByPk(reportId, {
        transaction: t,
      });
      if (!medicalReport) {
        if (t && !t.finished) {
          try {
            await t.rollback();
          } catch (rollbackError) {
            console.error("Error rolling back transaction:", rollbackError);
          }
        }
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Verify the culture exists
      const culture = await db.culture.findByPk(cultureId, { transaction: t });
      if (!culture) {
        if (t && !t.finished) {
          try {
            await t.rollback();
          } catch (rollbackError) {
            console.error("Error rolling back transaction:", rollbackError);
          }
        }
        return res.status(404).json({ error: "Culture not found" });
      }

      // Find the medical report culture entry
      const reportCulture = await db.medical_report_has_culture.findOne({
        where: {
          medical_report_id: reportId,
          culture_id: cultureId,
        },
        transaction: t,
      });

      if (!reportCulture) {
        if (t && !t.finished) {
          try {
            await t.rollback();
          } catch (rollbackError) {
            console.error("Error rolling back transaction:", rollbackError);
          }
        }

        // Provide more detailed error information
        const allCulturesInReport = await db.medical_report_has_culture.findAll(
          {
            where: { medical_report_id: reportId },
            attributes: ["culture_id"],
          }
        );

        console.error(
          `Culture association not found. Medical report ${reportId} has ${allCulturesInReport.length} cultures:`,
          allCulturesInReport.map((c) => c.culture_id)
        );

        return res.status(404).json({
          error: "Culture not found in this medical report",
          details: {
            medicalReportId: reportId,
            cultureId: cultureId,
            availableCultures: allCulturesInReport.map((c) => c.culture_id),
            cultureName: culture.name,
            medicalReportDate: medicalReport.date,
          },
        });
      }

      // Check if there are any actual culture results in medical_report_culture_result table
      const actualCultureResults = await db.medical_report_culture_result.findAll({
        where: {
          medical_report_has_culture_id: reportCulture.id,
        },
        transaction: t,
      });

      // Set status to 'done' if there are actual culture results, otherwise use provided status or 'pending'
      const finalStatus = actualCultureResults.length > 0 ? "done" : status || "pending";

      // Update the culture result
      await db.medical_report_has_culture.update(
        {
          result: result || null, // Keep this for backward compatibility
          status: finalStatus,
          updatedAt: new Date(),
        },
        {
          where: {
            medical_report_id: reportId,
            culture_id: cultureId,
          },
          transaction: t,
        }
      );

      // Update received_at date when first culture result is entered
      if (result && result.trim()) {
        await updateMedicalReportDates(reportId, "received", t);
      }

      await t.commit();
      console.log(
        `Successfully saved culture result for medical report ${reportId}, culture ${cultureId}`
      );
      res.json({ success: true });
    } catch (error) {
      if (t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
      }
      console.error("Error saving culture result:", error);
      res.status(500).json({ error: "Failed to save culture result" });
    }
  }
);

// Save culture options data to medical_report_culture_result table
router.post(
  "/:reportId/cultures/:cultureId/culture-result",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { reportId, cultureId } = req.params;
      const {
        medical_report_has_culture_id,
        culture_option_name,
        culture_sub_option_name,
        custom_result,
        result_type,
      } = req.body;

      console.log(`Attempting to save culture options data:`, {
        reportId,
        cultureId,
        medical_report_has_culture_id,
        culture_option_name,
        culture_sub_option_name,
        custom_result,
        result_type,
      });

      // Verify the medical report exists
      const medicalReport = await db.medical_report.findByPk(reportId, {
        transaction: t,
      });
      if (!medicalReport) {
        await t.rollback();
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Verify the culture exists
      const culture = await db.culture.findByPk(cultureId, { transaction: t });
      if (!culture) {
        await t.rollback();
        return res.status(404).json({ error: "Culture not found" });
      }

      // Verify the medical_report_has_culture association exists
      const reportCulture = await db.medical_report_has_culture.findByPk(
        medical_report_has_culture_id,
        { transaction: t }
      );
      if (
        !reportCulture ||
        reportCulture.medical_report_id != reportId ||
        reportCulture.culture_id != cultureId
      ) {
        await t.rollback();
        return res.status(404).json({
          error: "Culture association not found in this medical report",
        });
      }

      // Check if a culture result already exists for this association
      const existingResult = await db.medical_report_culture_result.findOne({
        where: { medical_report_has_culture_id },
        transaction: t,
      });

      if (existingResult) {
        // Update existing result
        await existingResult.update(
          {
            culture_option_name,
            culture_sub_option_name,
            custom_result,
            result_type,
            updated_at: new Date(),
          },
          { transaction: t }
        );
        console.log(
          `Updated existing culture options data for medical report ${reportId}, culture ${cultureId}`
        );
      } else {
        // Create new result
        await db.medical_report_culture_result.create(
          {
            medical_report_has_culture_id,
            culture_option_name,
            culture_sub_option_name,
            custom_result,
            result_type,
          },
          { transaction: t }
        );
        console.log(
          `Created new culture options data for medical report ${reportId}, culture ${cultureId}`
        );
      }

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
      console.error("Error saving culture options data:", error);
      res.status(500).json({ error: "Failed to save culture options data" });
    }
  }
);

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

// Diagnostic endpoint to check culture associations
router.get(
  "/:reportId/cultures/check",
  authenticateUser,
  authorizeRoles("admin", "chemist", "receptionist"),
  async (req, res) => {
    try {
      const { reportId } = req.params;

      // Get the medical report with all its culture associations
      const medicalReport = await db.medical_report.findByPk(reportId, {
        include: [
          {
            model: db.culture,
            as: "cultures",
            through: { attributes: ["id", "result", "status"] },
            attributes: ["id", "name"],
          },
          {
            model: db.medical_report_has_culture,
            as: "medical_report_has_cultures",
            attributes: ["id", "culture_id", "result", "status"],
          },
        ],
      });

      if (!medicalReport) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Also get all cultures in the system for comparison
      const allCultures = await db.culture.findAll({
        attributes: ["id", "name"],
      });

      res.json({
        medicalReport: {
          id: medicalReport.id,
          date: medicalReport.date,
          patient_id: medicalReport.patient_id,
        },
        associatedCultures: medicalReport.cultures || [],
        cultureAssociations: medicalReport.medical_report_has_cultures || [],
        allCultures: allCultures,
        summary: {
          totalCulturesInSystem: allCultures.length,
          culturesAssociatedWithReport: medicalReport.cultures?.length || 0,
          cultureAssociationsCount:
            medicalReport.medical_report_has_cultures?.length || 0,
        },
      });
    } catch (error) {
      console.error("Error checking culture associations:", error);
      res.status(500).json({ error: "Failed to check culture associations" });
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
  async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const reportId = req.params.id;
      const {
        test_results = [],
        culture_results = [],
        test_component_results = {},
        test_group_values = {},
        culture_antibiotics = {},
        culture_options = {},
      } = req.body;

      console.log("Bulk save request:", {
        reportId,
        test_results: test_results.length,
        culture_results: culture_results.length,
        test_component_results: Object.keys(test_component_results).length,
        test_group_values: Object.keys(test_group_values).length,
        culture_antibiotics: Object.keys(culture_antibiotics).length,
        culture_options: Object.keys(culture_options).length,
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
        for (const result of test_results) {
          if (result.result && result.result.toString().trim() !== "") {
            hasAnyResults = true;
            // For tests without components, status is 'done' if result exists, 'pending' if empty
            const status = result.result && result.result.toString().trim() !== '' ? 'done' : 'pending';
            
            await db.medical_report_has_test.update(
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
        }
      }

      // 2. Save test component results
      if (Object.keys(test_component_results).length > 0) {
        for (const [testId, components] of Object.entries(
          test_component_results
        )) {
          // Get test components to access normal ranges
          const testComponents = await db.test_component.findAll({
            where: { test_id: parseInt(testId, 10) },
            attributes: ['id', 'normal_from', 'normal_to', 'c_low', 'c_high'],
            transaction: t
          });
          
          const componentResultsToSave = [];

          for (const [componentId, componentData] of Object.entries(
            components
          )) {
            if (
              componentData.result &&
              componentData.result.toString().trim() !== ""
            ) {
              hasAnyResults = true;
              
              // Find the component to get its normal range
              const component = testComponents.find(tc => tc.id === parseInt(componentId, 10));
              const calculatedStatus = calculateTestStatus(componentData.result, component);
              
              componentResultsToSave.push({
                medical_report_id: reportId,
                test_id: parseInt(testId, 10),
                test_component_id: parseInt(componentId, 10),
                result: componentData.result,
                status: calculatedStatus,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }

          if (componentResultsToSave.length > 0) {
            // Delete existing results for this test
            await db.medical_report_test_component_result.destroy({
              where: {
                medical_report_id: reportId,
                test_id: parseInt(testId, 10),
              },
              transaction: t,
            });

            // Bulk create new results
            await db.medical_report_test_component_result.bulkCreate(
              componentResultsToSave,
              { transaction: t }
            );
          }
        }
      }

      // 3. Save culture results
      if (culture_results.length > 0) {
        for (const result of culture_results) {
          if (result.result && result.result.toString().trim() !== "") {
            hasAnyResults = true;
            
            // First, find the medical_report_has_culture record
            const cultureRecord = await db.medical_report_has_culture.findOne({
              where: {
                medical_report_id: reportId,
                culture_id: result.culture_id,
              },
              transaction: t,
            });

            if (cultureRecord) {

              // Check if there are actual culture results in medical_report_culture_result table
              const actualCultureResults = await db.medical_report_culture_result.findAll({
                where: {
                  medical_report_has_culture_id: cultureRecord.id,
                },
                transaction: t,
              });

              // Set status based on existence of actual culture results
              const status = actualCultureResults.length > 0 ? "done" : "pending";
              await db.medical_report_has_culture.update(
                {
                  result: result.result, // Keep this for backward compatibility
                  status: status,
                  updatedAt: new Date(),
                },
                {
                  where: {
                    medical_report_id: reportId,
                    culture_id: result.culture_id,
                  },
                  transaction: t,
                }
              );
            }
          }
        }
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

      // 5. Save culture antibiotics (if any)
      if (Object.keys(culture_antibiotics).length > 0) {
        for (const [cultureResultId, antibiotics] of Object.entries(
          culture_antibiotics
        )) {
          if (antibiotics && antibiotics.length > 0) {
            // Delete existing antibiotics for this culture result
            await db.medical_report_has_culture_antibiotic.destroy({
              where: { medical_report_has_culture_id: cultureResultId },
              transaction: t,
            });

            // Bulk create new antibiotics
            const antibioticRecords = antibiotics.map((ab) => ({
              medical_report_has_culture_id: cultureResultId,
              antibiotic_id: ab.antibiotic_id,
              sensitivity: ab.sensitivity,
              zone_size: ab.zone_size || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            await db.medical_report_has_culture_antibiotic.bulkCreate(
              antibioticRecords,
              { transaction: t }
            );
          }
        }
      }

      // 6. Save culture options (if any)
      if (Object.keys(culture_options).length > 0) {
        for (const [cultureId, optionsArray] of Object.entries(
          culture_options
        )) {
          // Find the culture result ID
          const cultureResult = await db.medical_report_has_culture.findOne({
            where: {
              medical_report_id: reportId,
              culture_id: parseInt(cultureId, 10),
            },
            transaction: t,
          });

          if (cultureResult) {
            // Delete existing culture options
            await db.medical_report_culture_result.destroy({
              where: { medical_report_has_culture_id: cultureResult.id },
              transaction: t,
            });

            if (optionsArray && optionsArray.length > 0) {
              // Bulk create new culture options
              const optionRecords = optionsArray.map((option) => ({
                medical_report_has_culture_id: cultureResult.id,
                culture_option_name: option.culture_option_name || null,
                culture_sub_option_name: option.culture_sub_option_name || null,
                custom_result: option.custom_result || null,
                result_type: option.result_type || "custom",
                createdAt: new Date(),
                updatedAt: new Date(),
              }));

              await db.medical_report_culture_result.bulkCreate(optionRecords, {
                transaction: t,
              });

              // Update culture status to 'done' since we just added culture results
              await db.medical_report_has_culture.update(
                {
                  status: "done",
                },
                {
                  where: {
                    id: cultureResult.id,
                  },
                  transaction: t,
                }
              );
            } else {
              // No culture options provided, set status to 'pending'
              await db.medical_report_has_culture.update(
                {
                  status: "pending",
                },
                {
                  where: {
                    id: cultureResult.id,
                  },
                  transaction: t,
                }
              );
            }
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

module.exports = router;
