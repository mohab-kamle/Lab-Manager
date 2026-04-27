const express = require("express");
const router = express.Router();
const db = require("../models/index");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const { parsePhoneNumberFromString } = require('libphonenumber-js');

// Helper function to normalize phone number to E.164 format
const normalizePhone = (phoneStr) => {
  if (!phoneStr) return null;
  try {
    const phoneNumber = parsePhoneNumberFromString(phoneStr);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
    if (phoneStr.startsWith('+')) return phoneStr;
    return phoneStr;
  } catch (e) {
    return phoneStr;
  }
};

router.use(authenticateUser);
router.use(tenantContext);
router.use(authorizeRoles("admin", "manager", "chemist", "receptionist"));

// Get all suppliers
router.get("/", async (req, res) => {
  try {
    const suppliers = await db.supplier.findAll({
      where: { lab_id: req.tenant.lab_id },
      include: [
        {
          model: db.phone_number,
          as: 'phones'
        }
      ],
      order: [["name", "ASC"]],
    });
    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create supplier
router.post("/", authorizeRoles("admin", "manager", "chemist"), async (req, res) => {
  try {
    const { name, contact_info, email, phoneNumbers = [], address } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const supplier = await db.supplier.create({
      name,
      contact_info,
      email,
      address,
      lab_id: req.tenant.lab_id,
    });

    // Add phone numbers
    if (phoneNumbers && phoneNumbers.length > 0) {
      const phonesToCreate = phoneNumbers.map(p => {
        const normalized = normalizePhone(p.phone);
        return normalized ? {
          phone: normalized,
          type: p.type || 'personal',
          is_primary: p.is_primary || false,
          supplier_id: supplier.id
        } : null;
      }).filter(p => p !== null);

      if (phonesToCreate.length > 0) {
        if (!phonesToCreate.some(p => p.is_primary)) {
          phonesToCreate[0].is_primary = true;
        }
        await db.phone_number.bulkCreate(phonesToCreate);
      }
    }

    res.status(201).json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update supplier
router.put("/:id", authorizeRoles("admin", "manager", "chemist"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_info, email, phoneNumbers, address } = req.body;

    const supplier = await db.supplier.findOne({
      where: { id, lab_id: req.tenant.lab_id },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    await supplier.update({
      name,
      contact_info,
      email,
      address,
    });

    // Update phone numbers
    if (phoneNumbers !== undefined) {
      await db.phone_number.destroy({ where: { supplier_id: id } });
      const phonesToCreate = phoneNumbers.map(p => {
        const normalized = normalizePhone(p.phone);
        return normalized ? {
          phone: normalized,
          type: p.type || 'personal',
          is_primary: p.is_primary || false,
          supplier_id: id
        } : null;
      }).filter(p => p !== null);

      if (phonesToCreate.length > 0) {
        if (!phonesToCreate.some(p => p.is_primary)) {
          phonesToCreate[0].is_primary = true;
        }
        await db.phone_number.bulkCreate(phonesToCreate);
      }
    }

    res.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete supplier
router.delete("/:id", authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await db.supplier.findOne({
      where: { id, lab_id: req.tenant.lab_id },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Check if supplier is used in any batches
    const batchCount = await db.inventory_batch.count({
      where: { supplier_id: id, lab_id: req.tenant.lab_id }
    });

    if (batchCount > 0) {
      return res.status(400).json({ message: "Cannot delete supplier with associated inventory batches." });
    }

    await supplier.destroy();
    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
