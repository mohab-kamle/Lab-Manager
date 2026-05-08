const trackedSamplesService = require("../../services/trackedSamplesService");
const { lab_samples, medical_report } = require("../../models");

// Mocking models
jest.mock("../../models", () => {
  return {
    lab_samples: {
      findAll: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      destroy: jest.fn(),
    },
    medical_report: {
      findByPk: jest.fn(),
    },
    test: {},
    sample_type: {},
    patient: {},
    phone_number: {},
    lab: {},
    branch: {},
  };
});

describe("TrackedSamplesService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSamples", () => {
    it("should fetch all tracked samples scoped to the lab_id", async () => {
      const mockSamples = [{
        id: 1,
        sample_id: "SMP-123",
        medical_report_id: 10,
        createdAt: new Date(),
        medical_report: { bill_id: 50 },
        test: { name: "CBC" },
        sample_type: { type: "Blood" }
      }];
      
      lab_samples.findAll.mockResolvedValue(mockSamples);

      const result = await trackedSamplesService.getSamples({ lab_id: 1, report_id: null });
      
      expect(lab_samples.findAll).toHaveBeenCalledTimes(1);
      // Validate structure formatting
      expect(result).toHaveLength(1);
      expect(result[0].sample_id).toBe("SMP-123");
      expect(result[0].test_name).toBe("CBC");
      expect(result[0].sample_type).toBe("Blood");
      expect(result[0].invoice_id).toBe("INV-50");
    });
  });

  describe("createSample", () => {
    it("should create a sample if the medical report belongs to the lab", async () => {
      medical_report.findByPk.mockResolvedValue({ id: 10, lab_id: 1 });
      
      const newSampleMock = { id: 50, sample_id: "SMP-XYZ" };
      lab_samples.create.mockResolvedValue(newSampleMock);
      
      lab_samples.findByPk.mockResolvedValue({
        id: 50,
        sample_id: "SMP-XYZ",
        medical_report_id: 10,
        createdAt: new Date(),
      });

      const result = await trackedSamplesService.createSample({
        lab_id: 1,
        medical_report_id: 10,
        test_id: 5,
        sample_type_id: 2
      });

      expect(medical_report.findByPk).toHaveBeenCalledWith(10);
      expect(lab_samples.create).toHaveBeenCalled();
      expect(result.sample_id).toBe("SMP-XYZ");
    });

    it("should throw an error if medical_report does not match lab_id", async () => {
      medical_report.findByPk.mockResolvedValue({ id: 10, lab_id: 2 }); // Diff lab
      
      await expect(
        trackedSamplesService.createSample({ lab_id: 1, medical_report_id: 10 })
      ).rejects.toThrow("Access denied");
    });
  });

  describe("updateSampleStatus", () => {
    it("should throw error on invalid status", async () => {
      await expect(
        trackedSamplesService.updateSampleStatus({ id: 1, status: "Invalid Status" })
      ).rejects.toThrow("status must be one of:");
    });

    it("should update status and tracking history", async () => {
      const mockSample = {
        id: 1,
        status: "Pending Collection",
        status_history: {},
        medical_report: { lab_id: 1 },
        update: jest.fn().mockResolvedValue(true)
      };
      
      lab_samples.findByPk.mockResolvedValue(mockSample);

      await trackedSamplesService.updateSampleStatus({ id: 1, status: "Collected", lab_id: 1 });
      
      expect(mockSample.update).toHaveBeenCalled();
      const updateArgs = mockSample.update.mock.calls[0][0];
      expect(updateArgs.status).toBe("Collected");
      expect(updateArgs.status_history.collected_at).toBeDefined();
    });
  });

  describe("lookupSample", () => {
    it("should deny access if patient requests another patient's sample", async () => {
      lab_samples.findOne.mockResolvedValue({
        sample_id: "SMP-1",
        medical_report: { patient_id: 100 }
      });

      await expect(
        trackedSamplesService.lookupSample({
          sample_id: "SMP-1",
          user: { role: "patient", id: 200 } // Different patient
        })
      ).rejects.toThrow("Access denied: Patient mismatch");
    });

    it("should return detailed sample info for valid access", async () => {
      const mockSample = {
        sample_id: "SMP-1",
        status: "Completed",
        medical_report: {
          id: 10,
          patient_id: 100,
          lab_id: 1,
          patient: {
            id: 100,
            name: "John Doe",
            birth_date: "1990-01-01",
            gender: "Male",
            phones: [{ phone: "123456789" }]
          },
          branch: { name: "Main Branch" },
          lab: { name: "Main Lab" }
        },
        test: { name: "CBC", lab_to_lab_status: "IN" },
        sample_type: { type: "Blood" }
      };

      lab_samples.findOne.mockResolvedValue(mockSample);

      const result = await trackedSamplesService.lookupSample({
        sample_id: "SMP-1",
        user: { role: "admin", lab_id: 1 } // Valid lab staff
      });

      expect(result.patient.name).toBe("John Doe");
      expect(result.patient.phone).toBe("123456789");
      expect(result.branch.name).toBe("Main Branch");
      expect(result.test.name).toBe("CBC");
      expect(result.test.lab_to_lab_status).toBe("In-House");
    });
  });
});
