const express = require("express");
const router = express.Router();
const { contract } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const multer = require("multer");
const xlsx = require("xlsx");
require("dotenv").config();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * GET /contracts - Fetch all contracts
 */
router.get("/", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    const contracts = await contract.findAll({
      order: [["id", "DESC"]],
    });
    res.json(contracts || []);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

/**
 * GET /contracts/:id - Get a specific contract by ID
 */
router.get("/:id", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    const { id } = req.params;
    const contractRecord = await contract.findByPk(id);
    
    if (!contractRecord) {
      return res.status(404).json({ error: "Contract not found" });
    }
    
    res.json(contractRecord);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

/**
 * POST /contracts - Create a new contract
 */
router.post("/", authenticateUser, authorizeRoles("admin", "receptionist"), async (req, res) => {
  try {
    const { name, region, governorate, discount_type, discount_amount, details } = req.body;

    // Validate required fields
    if (!region || !governorate) {
      return res.status(400).json({ error: "Region and governorate are required" });
    }

    // Check if contract already exists with same region and governorate
    const existingContract = await contract.findOne({
      where: { region, governorate }
    });

    if (existingContract) {
      return res.status(400).json({ error: "Contract already exists for this region and governorate" });
    }

    // Auto-generate name if not provided
    const contractName = name || `${region} - ${governorate}`;

    const newContract = await contract.create({
      name: contractName,
      region,
      governorate,
      discount_type: discount_type || "none",
      discount_amount: discount_amount !== undefined ? discount_amount : 0.00,
      details: details || ""
    });

    res.status(201).json(newContract);
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

/**
 * PUT /contracts/:id - Update an existing contract
 */
router.put("/:id", authenticateUser, authorizeRoles("admin", "receptionist"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region, governorate, discount_type, discount_amount, details } = req.body;

    const existingContract = await contract.findByPk(id);
    if (!existingContract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    // Check if another contract exists with same region and governorate
    if (region && governorate) {
      const duplicateContract = await contract.findOne({
        where: { 
          region, 
          governorate,
          id: { [require("sequelize").Op.ne]: id }
        }
      });

      if (duplicateContract) {
        return res.status(400).json({ error: "Another contract already exists for this region and governorate" });
      }
    }

    // Auto-generate name if not provided and region/governorate changed
    let contractName = name;
    if (!contractName && (region || governorate)) {
      const newRegion = region || existingContract.region;
      const newGovernorate = governorate || existingContract.governorate;
      contractName = `${newRegion} - ${newGovernorate}`;
    }

    await existingContract.update({
      name: contractName || existingContract.name,
      region: region || existingContract.region,
      governorate: governorate || existingContract.governorate,
      discount_type: discount_type || existingContract.discount_type,
      discount_amount: discount_amount !== undefined ? discount_amount : existingContract.discount_amount,
      details: details !== undefined ? details : existingContract.details
    });

    res.json(existingContract);
  } catch (error) {
    console.error("Error updating contract:", error);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

/**
 * DELETE /contracts/:id - Delete a contract
 */
router.delete("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingContract = await contract.findByPk(id);
    if (!existingContract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    await existingContract.destroy();
    
    res.json({ 
      success: true, 
      message: "Contract deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting contract:", error);
    res.status(500).json({ error: "Failed to delete contract" });
  }
});

/**
 * POST /contracts/import - Import contracts from Excel/CSV file
 */
router.post("/import", authenticateUser, authorizeRoles("admin", "receptionist"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: "No data found in the file" });
    }

    let imported = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const region = row["Region"] || row["region"];
        const governorate = row["Governorate"] || row["governorate"];
        const discountType = row["Discount Type"] || row["discount_type"] || row["DiscountType"] || "none";
        const discountAmount = row["Discount Amount"] || row["discount_amount"] || 0.00;
        const details = row["Details"] || row["details"] || "";
        const contractName = row["Name"] || row["name"] || `${region} - ${governorate}`;

        if (!region || !governorate) {
          errors.push(`Row ${i + 2}: Region and governorate are required`);
          continue;
        }

        // Validate discount type
        const validDiscountTypes = ["percentage", "custom price", "none"];
        if (!validDiscountTypes.includes(discountType.toLowerCase())) {
          errors.push(`Row ${i + 2}: Invalid discount type. Must be one of: ${validDiscountTypes.join(", ")}`);
          continue;
        }

        // Check if contract exists
        const existingContract = await contract.findOne({
          where: { region, governorate }
        });

        if (existingContract) {
          // Update existing contract
          await existingContract.update({
            name: contractName,
            discount_type: discountType.toLowerCase(),
            discount_amount: discountAmount,
            details
          });
          updated++;
        } else {
          // Create new contract
          await contract.create({
            name: contractName,
            region,
            governorate,
            discount_type: discountType.toLowerCase(),
            discount_amount: discountAmount,
            details
          });
          imported++;
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    res.json({
      imported,
      updated,
      errors,
      message: `Import completed. Imported: ${imported}, Updated: ${updated}, Errors: ${errors.length}`
    });
  } catch (error) {
    console.error("Error importing contracts:", error);
    res.status(500).json({ error: "Failed to import contracts" });
  }
});

/**
 * GET /contracts/export - Export contracts to Excel
 */
router.get("/export", authenticateUser, authorizeRoles("admin", "receptionist", "chemist", "doctor", "employee"), async (req, res) => {
  try {
    const contracts = await contract.findAll({
      order: [["id", "ASC"]],
    });

    const exportData = contracts.map(contract => ({
      "ID": contract.id,
      "Name": contract.name,
      "Region": contract.region,
      "Governorate": contract.governorate,
      "Discount Type": contract.discount_type,
      "Discount Amount": contract.discount_amount,
      "Details": contract.details
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Contracts");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=contracts_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting contracts:", error);
    res.status(500).json({ error: "Failed to export contracts" });
  }
});

module.exports = router; 