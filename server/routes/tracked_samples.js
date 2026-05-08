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
          attributes: ["id", "bill_id", "lab_id"],
          // FIX #6: Tenant isolation — only return samples belonging to the
          // authenticated user's lab by filtering on the nested medical_report.
          where: req.user.lab_id ? { lab_id: req.user.lab_id } : undefined,
          required: !!req.user.lab_id, // INNER JOIN when lab_id is present
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

      const formattedSamples = samples.map((sample) => ({
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
        status: sample.status || "Pending Collection",
        status_history: sample.status_history || blankHistory(sample.createdAt),
        created_at: sample.createdAt,
      }));

      res.json(formattedSamples);
    } catch (error) {
      console.error("Error fetching tracked samples:", error);
      res.status(500).json({ error: "Failed to fetch tracked samples" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create Tracked Sample
//    Only lab staff (not patients) may create samples.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { medical_report_id, test_id, sample_type_id, sample_id } = req.body;

      // FIX: Input validation
      if (!medical_report_id) {
        return res.status(400).json({ error: "medical_report_id is required" });
      }

      // Auto-generate sample_id if not provided
      const generatedSampleId =
        sample_id || `SMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const now = new Date().toISOString();

      const newSample = await lab_samples.create({
        sample_id: generatedSampleId,
        medical_report_id,
        test_id,
        sample_type_id,
        status: "Pending Collection",
        status_history: blankHistory(now),
      });

      // Fetch the created sample with its relations for the response
      const sampleWithRelations = await lab_samples.findByPk(newSample.id, {
        include: [
          { model: test,            as: "test",            attributes: ["name"] },
          { model: sample_type,     as: "sample_type",     attributes: ["type"] },
          { model: medical_report,  as: "medical_report",  attributes: ["bill_id"] },
        ],
      });

      res.status(201).json({
        id:               sampleWithRelations.id,
        sample_id:        sampleWithRelations.sample_id,
        medical_report_id: sampleWithRelations.medical_report_id,
        invoice_id: sampleWithRelations.medical_report?.bill_id
          ? `INV-${sampleWithRelations.medical_report.bill_id}`
          : null,
        test_id:          sampleWithRelations.test_id,
        test_name:        sampleWithRelations.test?.name ?? null,
        sample_type_id:   sampleWithRelations.sample_type_id,
        sample_type:      sampleWithRelations.sample_type?.type ?? null,
        status:           sampleWithRelations.status,
        status_history:   sampleWithRelations.status_history,
        created_at:       sampleWithRelations.createdAt,
      });
    } catch (error) {
      console.error("Error creating tracked sample:", error);
      res.status(500).json({ error: "Failed to create sample" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update Sample Status
//    FIX #1: `key` is now correctly extracted from STATUS_KEY_MAP.
//    FIX #5: Restricted to lab staff only.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/status",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // FIX: Validate status value before any DB call
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }

      const sample = await lab_samples.findByPk(id);
      if (!sample) {
        return res.status(404).json({ error: "Sample not found" });
      }

      const currentHistory =
        sample.status_history || blankHistory(sample.createdAt);

      // FIX #1: Actually extract the key from the map
      const historyKey = STATUS_KEY_MAP[status];

      // Create a NEW object to ensure Sequelize detects the change on a JSON column
      const updatedHistory = {
        ...currentHistory,
        [historyKey]: new Date().toISOString(),
      };

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
//    FIX #5: Restricted to admin only (highest privilege destructive action).
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
//    FIX #2: phone_number included → phone is no longer null.
//    FIX #3: sample_type included → type is a name string, not an ID.
//    FIX #11: branch included → branch_name comes from the branch record.
//    Open to all authenticated users (patients can scan their own samples).
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
        // FIX #3: include sample_type so we get the name string
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
              // FIX #2: include phone numbers
              include: [
                {
                  model: phone_number,
                  as: "phones",
                  attributes: ["phone"],
                },
              ],
            },
            // FIX #11: include branch (not just lab) for the branch_name field
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

    // Calculate age from birth_date
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

    // FIX #2: pull first phone number (patients commonly have one primary)
    const primaryPhone =
      sample.medical_report?.patient?.phones?.[0]?.phone ?? null;

    // Prefer branch name; fall back to lab name for labs without branches
    const branchName =
      sample.medical_report?.branch?.name ??
      sample.medical_report?.lab?.name ??
      null;

    res.json({
      sample: {
        id:             sample.sample_id,
        type:           sample.sample_type?.type ?? null, // FIX #3: name string
        status:         sample.status,
        status_history: sample.status_history,
      },
      patient: {
        id:    sample.medical_report?.patient?.id   ?? null,
        name:  sample.medical_report?.patient?.name ?? null,
        phone: primaryPhone,                                  // FIX #2
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
