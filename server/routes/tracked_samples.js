const express = require("express");
const router = express.Router();
const trackedSamplesService = require("../services/trackedSamplesService");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Get Tracked Samples (tenant-scoped)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const samples = await trackedSamplesService.getSamples({
        lab_id: req.user.lab_id,
        report_id: req.query.report_id,
      });
      res.json(samples);
    } catch (error) {
      console.error("Error fetching tracked samples:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to fetch tracked samples" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create Tracked Sample
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { medical_report_id, test_id, sample_type_id, sample_id } = req.body;
      const sample = await trackedSamplesService.createSample({
        lab_id: req.user.lab_id,
        medical_report_id,
        test_id,
        sample_type_id,
        sample_id,
      });
      res.status(201).json(sample);
    } catch (error) {
      console.error("Error creating tracked sample:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to create sample" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update Sample Status
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/status",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "chemist", "employee"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedSample = await trackedSamplesService.updateSampleStatus({
        id,
        status,
        lab_id: req.user.lab_id,
      });
      res.json(updatedSample);
    } catch (error) {
      console.error("Error updating sample status:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to update status" });
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
      const response = await trackedSamplesService.deleteSample({
        id,
        lab_id: req.user.lab_id,
      });
      res.json(response);
    } catch (error) {
      console.error("Error deleting tracked sample:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to delete sample" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sample Quick Info Lookup (barcode scan entry point)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/lookup/:sample_id", authenticateUser, async (req, res) => {
  try {
    const { sample_id } = req.params;
    const lookupResult = await trackedSamplesService.lookupSample({
      sample_id,
      user: req.user,
    });
    res.json(lookupResult);
  } catch (error) {
    console.error("Error looking up sample:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to look up sample" });
  }
});

module.exports = router;
