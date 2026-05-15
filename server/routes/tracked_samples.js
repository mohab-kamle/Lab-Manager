const express = require("express");
const router = express.Router();
const {
  lab_samples,
  medical_report,
  patient,
  phone_number,
  lab,
  branch,
  test,
  sample_type,
} = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
// Valid status values and their history-key mapping
const STATUS_KEY_MAP = {
  "Pending Collection": "pending_collection_at",
  "Collected":          "collected_at",
  "Dispatched":         "dispatched_at",
  "In Process":         "in_process_at",
  "Completed":          "completed_at",
  "Rejected":           "rejected_at",
};
const VALID_STATUSES = Object.keys(STATUS_KEY_MAP);
// Helper to build a blank status_history object
const blankHistory = (createdAt) => ({
  pending_collection_at: createdAt || new Date().toISOString(),
  collected_at:   null,
  dispatched_at:  null,
  in_process_at:  null,
  completed_at:   null,
  rejected_at:    null,
});
// ─────────────────────────────────────────────────────────────────────────────
// 1. Get Tracked Samples (tenant-scoped)
//    All authenticated lab staff can list; tenant isolation enforced via lab_id.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { report_id } = req.query;
      const includeClause = [
        {
          model: test,
          as: "test",
          attributes: ["id", "name"],
        },
        {
          model: sample_type,
          as: "sample_type",
          attributes: ["type"],
        },
        {
          model: medical_report,
          as: "medical_report",
          attributes: ["id", "bill_id", "lab_id", "branch_id"],
          where: req.user.lab_id ? { lab_id: req.user.lab_id } : undefined,
          required: !!req.user.lab_id,
          include: [
            { model: branch, as: "branch", attributes: ["name"] },
            { model: lab, as: "lab", attributes: ["name"] },
          ],
        },
      ];
      const whereClause = {};
      if (report_id) {
        whereClause.medical_report_id = report_id;
      }
      const samples = await lab_samples.findAll({
        where: whereClause,
        include: includeClause,
        order: [["createdAt", "DESC"]],
      });
      const formattedSamples = samples.map((sample) => {
        const branchName =
          sample.medical_report?.branch?.name ??
          sample.medical_report?.lab?.name ??
          null;

        return {
          id: sample.id,
          sample_id: sample.sample_id,
          medical_report_id: sample.medical_report_id,
          invoice_id: sample.medical_report?.bill_id
            ? `INV-${sample.medical_report.bill_id}`
            : null,
          test_id: sample.test_id,
          test_name: sample.test?.name ?? null,
          sample_type_id: sample.sample_type_id,
          sample_type: sample.sample_type?.type ?? null,
          branch_name: branchName,
          status: sample.status || "Pending Collection",
          status_history: sample.status_history || blankHistory(sample.createdAt),
          created_at: sample.createdAt,
        };
      });
      res.json(formattedSamples);

    } catch (error) {
      console.error("Error fetching tracked samples:", error);
      res.status(500).json({ error: "Failed to fetch tracked samples" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create Tracked Sample
//    Automatically associates with medical report tests and pulls sample types.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { medical_report_id, test_id, sample_type_id } = req.body;

      if (!medical_report_id) {
        return res.status(400).json({ error: "medical_report_id is required" });
      }

      // Fetch the medical report to verify it exists and get its tests
      // Scoped to the user's lab for security.
      const report = await medical_report.findOne({
        where: req.user.lab_id 
          ? { id: medical_report_id, lab_id: req.user.lab_id }
          : { id: medical_report_id },
        include: [{ model: test, as: "tests", attributes: ["id", "sample_type_id"] }],
      });

      if (!report) {
        return res.status(404).json({ error: "Medical report not found" });
      }

      // Determine which tests to create samples for
      if (!test_id) {
        return res.status(400).json({ error: "test_id is required" });
      }

      const testIds = (Array.isArray(test_id) ? test_id : [test_id]).map(id => Number(id));
      const testsToProcess = report.tests.filter(t => testIds.includes(t.id));

      if (testsToProcess.length === 0) {
        return res.status(400).json({ error: "The selected test was not found in this report" });
      }

      const createdSamples = [];
      const now = new Date().toISOString();

      for (const testItem of testsToProcess) {
        // Prevent duplicate: skip if a sample already exists for this test in this report
        const existingSample = await lab_samples.findOne({
          where: { medical_report_id, test_id: testItem.id }
        });
        if (existingSample) {
          // Skip silently or inform the caller — we skip to allow partial creation
          continue;
        }

        const generatedSampleId = `SMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Use provided sample_type_id or fall back to the one defined in the test
        const effectiveSampleTypeId = sample_type_id || testItem.sample_type_id;

        const newSample = await lab_samples.create({
          sample_id: generatedSampleId,
          medical_report_id,
          test_id: testItem.id,
          sample_type_id: effectiveSampleTypeId,
          status: "Pending Collection",
          status_history: blankHistory(now),
        });
        createdSamples.push(newSample);
      }

      // Fetch the created samples with relations for the response
      const results = await lab_samples.findAll({
        where: { id: createdSamples.map(s => s.id) },
        include: [
          { model: test,            as: "test",            attributes: ["name"] },
          { model: sample_type,     as: "sample_type",     attributes: ["type"] },
          { model: medical_report,  as: "medical_report",  attributes: ["bill_id"] },
        ],
      });

      const formattedResults = results.map(sample => ({
        id:               sample.id,
        sample_id:        sample.sample_id,
        medical_report_id: sample.medical_report_id,
        invoice_id: sample.medical_report?.bill_id
          ? `INV-${sample.medical_report.bill_id}`
          : null,
        test_id:          sample.test_id,
        test_name:        sample.test?.name ?? null,
        sample_type_id:   sample.sample_type_id,
        sample_type:      sample.sample_type?.type ?? null,
        status:           sample.status,
        status_history:   sample.status_history,
        created_at:       sample.createdAt,
      }));

      res.status(201).json(formattedResults.length === 1 ? formattedResults[0] : formattedResults);
    } catch (error) {
      console.error("Error creating tracked sample:", error);
      res.status(500).json({ error: "Failed to create sample" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update Sample Status
//    Clears future status dates if moving back in time.
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_SEQUENCE = [
  "Pending Collection",
  "Collected",
  "Dispatched",
  "In Process",
  "Completed",
];

router.put(
  "/:id/status",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }
      const sample = await lab_samples.findByPk(id);
      if (!sample) {
        return res.status(404).json({ error: "Sample not found" });
      }

      const currentHistory = sample.status_history || blankHistory(sample.createdAt);
      const historyKey = STATUS_KEY_MAP[status];
      const updatedHistory = { ...currentHistory };

      // Set the date for the new status
      updatedHistory[historyKey] = new Date().toISOString();

      // Logic: If moving back to an earlier status, clear all later dates
      const statusIndex = STATUS_SEQUENCE.indexOf(status);
      if (statusIndex !== -1) {
        // Clear all statuses that come after this one in the sequence
        STATUS_SEQUENCE.slice(statusIndex + 1).forEach(s => {
          const key = STATUS_KEY_MAP[s];
          if (key) updatedHistory[key] = null;
        });
        // Also clear 'Rejected' if returning to the main flow
        updatedHistory.rejected_at = null;
      }

      await sample.update({ status, status_history: updatedHistory });
      res.json({
        id:             sample.id,
        status:         sample.status,
        status_history: sample.status_history,
        updated_at:     sample.updatedAt,
      });
    } catch (error) {
      console.error("Error updating sample status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Delete Tracked Sample
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCount = await lab_samples.destroy({ where: { id } });
      if (deletedCount === 0) {
        return res.status(404).json({ error: "Sample not found" });
      }
      res.json({ message: "Sample deleted successfully" });
    } catch (error) {
      console.error("Error deleting tracked sample:", error);
      res.status(500).json({ error: "Failed to delete sample" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sample Quick Info Lookup (barcode scan entry point)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/lookup/:sample_id", authenticateUser, async (req, res) => {
  try {
    const { sample_id } = req.params;
    const sample = await lab_samples.findOne({
      where: { sample_id },
      include: [
        {
          model: test,
          as: "test",
          attributes: ["name", "lab_to_lab_status", "lab_name"],
        },
        {
          model: sample_type,
          as: "sample_type",
          attributes: ["type"],
        },
        {
          model: medical_report,
          as: "medical_report",
          attributes: ["id", "patient_id", "lab_id", "branch_id"],
          include: [
            {
              model: patient,
              as: "patient",
              attributes: ["id", "name", "birth_date", "gender"],
              include: [
                {
                  model: phone_number,
                  as: "phones",
                  attributes: ["phone"],
                },
              ],
            },
            {
              model: branch,
              as: "branch",
              attributes: ["id", "name"],
            },
            {
              model: lab,
              as: "lab",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });
    if (!sample) {
      return res.status(404).json({ error: "Sample not found" });
    }

    let age = null;
    const birthDateRaw = sample.medical_report?.patient?.birth_date;
    if (birthDateRaw) {
      const birthDate = new Date(birthDateRaw);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    const primaryPhone =
      sample.medical_report?.patient?.phones?.[0]?.phone ?? null;

    const branchName =
      sample.medical_report?.branch?.name ??
      sample.medical_report?.lab?.name ??
      null;

    res.json({
      sample: {
        id:             sample.sample_id,
        type:           sample.sample_type?.type ?? null,
        status:         sample.status,
        status_history: sample.status_history,
      },
      patient: {
        id:    sample.medical_report?.patient?.id   ?? null,
        name:  sample.medical_report?.patient?.name ?? null,
        phone: primaryPhone,
        age,
        sex:   sample.medical_report?.patient?.gender ?? null,
      },
      branch: {
        name: branchName,
      },
      test: {
        name:              sample.test?.name ?? null,
        lab_to_lab_status:
          sample.test?.lab_to_lab_status === "OUT" ? "Outsourced" : "In-House",
        lab_name: sample.test?.lab_name ?? null,
      },
      report: {
        id: sample.medical_report?.id ?? null,
      },
    });
  } catch (error) {
    console.error("Error looking up sample:", error);
    res.status(500).json({ error: "Failed to look up sample" });
  }
});
module.exports = router;