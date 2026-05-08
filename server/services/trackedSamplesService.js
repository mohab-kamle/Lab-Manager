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
  pending_collection_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
  collected_at:   null,
  dispatched_at:  null,
  in_process_at:  null,
  completed_at:   null,
  rejected_at:    null,
});

class TrackedSamplesService {
  /**
   * Get tracked samples (tenant-scoped)
   */
  async getSamples({ lab_id, report_id }) {
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
        // Tenant isolation
        where: lab_id ? { lab_id } : undefined,
        required: !!lab_id, // INNER JOIN when lab_id is present
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

    return samples.map((sample) => ({
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
  }

  /**
   * Create a tracked sample
   */
  async createSample({ lab_id, medical_report_id, test_id, sample_type_id, sample_id }) {
    if (!medical_report_id) {
      const error = new Error("medical_report_id is required");
      error.status = 400;
      throw error;
    }

    const report = await medical_report.findByPk(medical_report_id);
    if (!report) {
      const error = new Error("Medical report not found");
      error.status = 404;
      throw error;
    }
    if (lab_id && report.lab_id !== lab_id) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }

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

    const sampleWithRelations = await lab_samples.findByPk(newSample.id, {
      include: [
        { model: test,            as: "test",            attributes: ["name"] },
        { model: sample_type,     as: "sample_type",     attributes: ["type"] },
        { model: medical_report,  as: "medical_report",  attributes: ["bill_id"] },
      ],
    });

    return {
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
    };
  }

  /**
   * Update sample status
   */
  async updateSampleStatus({ id, status, lab_id }) {
    if (!status || !VALID_STATUSES.includes(status)) {
      const error = new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
      error.status = 400;
      throw error;
    }

    const sample = await lab_samples.findByPk(id, {
      include: [{ model: medical_report, as: "medical_report", attributes: ["lab_id"] }]
    });
    if (!sample) {
      const error = new Error("Sample not found");
      error.status = 404;
      throw error;
    }

    if (lab_id && sample.medical_report?.lab_id !== lab_id) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }

    const currentHistory = sample.status_history || blankHistory(sample.createdAt);
    const historyKey = STATUS_KEY_MAP[status];
    
    if (!historyKey) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }

    const updatedHistory = {
      ...currentHistory,
      [historyKey]: new Date().toISOString(),
    };

    await sample.update({ status, status_history: updatedHistory });

    return {
      id:             sample.id,
      status:         sample.status,
      status_history: sample.status_history,
      updated_at:     sample.updatedAt,
    };
  }

  /**
   * Delete a tracked sample
   */
  async deleteSample({ id, lab_id }) {
    const sample = await lab_samples.findByPk(id, {
      include: [{ model: medical_report, as: "medical_report", attributes: ["lab_id"] }]
    });
    if (!sample) {
      const error = new Error("Sample not found");
      error.status = 404;
      throw error;
    }

    if (lab_id && sample.medical_report?.lab_id !== lab_id) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }

    await lab_samples.destroy({ where: { id } });
    return { message: "Sample deleted successfully" };
  }

  /**
   * Sample Quick Info Lookup
   */
  async lookupSample({ sample_id, user }) {
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
      const error = new Error("Sample not found");
      error.status = 404;
      throw error;
    }

    // Tenant check
    if (user.role !== "patient" && user.lab_id && sample.medical_report?.lab_id !== user.lab_id) {
      const error = new Error("Access denied: Tenant mismatch");
      error.status = 403;
      throw error;
    }
    if (user.role === "patient" && sample.medical_report?.patient_id !== user.id) {
      const error = new Error("Access denied: Patient mismatch");
      error.status = 403;
      throw error;
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

    const primaryPhone = sample.medical_report?.patient?.phones?.[0]?.phone ?? null;
    const branchName = sample.medical_report?.branch?.name ?? sample.medical_report?.lab?.name ?? null;

    return {
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
        lab_to_lab_status: sample.test?.lab_to_lab_status === "OUT" ? "Outsourced" : "In-House",
        lab_name:          sample.test?.lab_name ?? null,
      },
      report: {
        id: sample.medical_report?.id ?? null,
      },
    };
  }
}

module.exports = new TrackedSamplesService();
