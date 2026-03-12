const express = require("express");
const router = express.Router();
const db = require("../models/index");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const { tenantContext } = require("../middleware/tenantContext");
const Sequelize = require("sequelize");
const inventoryEvents = require("../services/inventoryEvents");

router.use(authenticateUser);
router.use(tenantContext);
router.use(authorizeRoles("admin", "manager", "chemist"));

// --- ITEMS ---

// Get all inventory items with computed total stock
router.get("/items", async (req, res) => {
  try {
    const items = await db.inventory_item.findAll({
      where: { lab_id: req.tenant.lab_id },
      include: [
        {
          model: db.inventory_batch,
          as: "batches",
          required: false,
          where: { lab_id: req.tenant.lab_id }
        }
      ],
      order: [["name", "ASC"]],
    });

    // Compute total stock manually or use Sequelize literal (manual is safer with includes)
    const itemsWithStock = items.map(item => {
      const itemData = item.toJSON();
      const totalStock = itemData.batches.reduce((sum, batch) => sum + Number(batch.current_quantity), 0);
      itemData.total_stock = totalStock;
      return itemData;
    });

    res.json(itemsWithStock);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create item
router.post("/items", async (req, res) => {
  try {
    const { name, category, unit, min_stock_level, description } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ message: "Name and unit are required" });
    }

    const item = await db.inventory_item.create({
      name,
      category,
      unit,
      min_stock_level: min_stock_level || 0,
      description,
      lab_id: req.tenant.lab_id,
    });

    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update item
router.put("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, min_stock_level, description } = req.body;

    const item = await db.inventory_item.findOne({
      where: { id, lab_id: req.tenant.lab_id },
    });

    if (!item) return res.status(404).json({ message: "Item not found" });

    await item.update({
      name,
      category,
      unit,
      min_stock_level,
      description,
    });

    res.json(item);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete item
router.delete("/items/:id", authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { id } = req.params;

    const item = await db.inventory_item.findOne({
      where: { id, lab_id: req.tenant.lab_id },
    });

    if (!item) return res.status(404).json({ message: "Item not found" });

    const batchCount = await db.inventory_batch.count({
      where: { item_id: id, lab_id: req.tenant.lab_id }
    });

    if (batchCount > 0) {
      return res.status(400).json({ message: "Cannot delete item with existing stock batches." });
    }

    await item.destroy();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --- BATCHES & STOCK MOVEMENTS ---

// Get batches for an item
router.get("/items/:item_id/batches", async (req, res) => {
  try {
    const { item_id } = req.params;
    const batches = await db.inventory_batch.findAll({
      where: { item_id, lab_id: req.tenant.lab_id },
      include: [{ model: db.supplier, as: "supplier", attributes: ["id", "name"] }],
      order: [["expiration_date", "ASC"]], // FIFO ordering
    });
    res.json(batches);
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Receive Stock (Create Batch & Transaction)
router.post("/receive", async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { item_id, supplier_id, batch_number, quantity, received_date, expiration_date, cost_per_unit, notes } = req.body;

    if (!item_id || !batch_number || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid receiving data" });
    }

    // Bug 2 Fix: Verify item belongs to current tenant
    const itemRecord = await db.inventory_item.findOne({
      where: { id: item_id, lab_id: req.tenant.lab_id },
      transaction: t
    });
    if (!itemRecord) {
      await t.rollback();
      return res.status(404).json({ message: "Inventory item not found in your lab" });
    }

    // Bug 2 Fix: Verify supplier belongs to current tenant (if provided)
    if (supplier_id) {
      const supplierRecord = await db.supplier.findOne({
        where: { id: supplier_id, lab_id: req.tenant.lab_id },
        transaction: t
      });
      if (!supplierRecord) {
        await t.rollback();
        return res.status(404).json({ message: "Supplier not found in your lab" });
      }
    }

    const batch = await db.inventory_batch.create({
      item_id,
      supplier_id: supplier_id || null,
      batch_number,
      initial_quantity: quantity,
      current_quantity: quantity,
      received_date: received_date || new Date(),
      expiration_date: expiration_date || null,
      cost_per_unit: cost_per_unit || null,
      lab_id: req.tenant.lab_id,
    }, { transaction: t });

    await db.inventory_transaction.create({
      item_id,
      batch_id: batch.id,
      transaction_type: 'RECEIVE',
      quantity: quantity,
      notes: notes || "Initial stock receipt",
      employee_id: req.user.id,
      lab_id: req.tenant.lab_id,
    }, { transaction: t });

    await t.commit();
    res.status(201).json(batch);

    // Trigger StockUpdate Event
    const io = req.app.get("io");
    inventoryEvents.emit("StockUpdate", { item_id, lab_id: req.tenant.lab_id, io });
  } catch (error) {
    await t.rollback();
    console.error("Error receiving stock:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Consume Stock (Deduct from specific batch or FIFO)
router.post("/consume", async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { item_id, batch_id, quantity, notes } = req.body;

    if (!item_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid consumption data" });
    }

    let qtyToDeduct = Number(quantity);
    let batchesToProcess = [];

    if (batch_id) {
      // Consume from specific batch
      // Bug 3 Fix: Lock the row to prevent concurrent reads from using stale data
      const batch = await db.inventory_batch.findOne({
        where: { id: batch_id, item_id, lab_id: req.tenant.lab_id },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!batch) throw new Error("Batch not found");
      if (Number(batch.current_quantity) < qtyToDeduct) {
        throw new Error(`Insufficient stock in batch ${batch.batch_number}`);
      }
      batchesToProcess.push({ batch, deductQty: qtyToDeduct });
    } else {
      // FIFO Logic
      // Bug 3 Fix: Lock rows to prevent concurrent reads from using stale data
      const availableBatches = await db.inventory_batch.findAll({
        where: {
          item_id,
          lab_id: req.tenant.lab_id,
          current_quantity: { [Sequelize.Op.gt]: 0 }
        },
        order: [
          [db.sequelize.literal('CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
          ['expiration_date', 'ASC'],
          ['received_date', 'ASC']
        ],
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      let remainingToDeduct = qtyToDeduct;
      for (const batch of availableBatches) {
        if (remainingToDeduct <= 0) break;

        const availableInBatch = Number(batch.current_quantity);
        const deductFromBatch = Math.min(availableInBatch, remainingToDeduct);

        batchesToProcess.push({ batch, deductQty: deductFromBatch });
        remainingToDeduct -= deductFromBatch;
      }

      if (remainingToDeduct > 0) {
        throw new Error(`Insufficient overall stock. Need ${qtyToDeduct}, but only ${qtyToDeduct - remainingToDeduct} available.`);
      }
    }

    for (const process of batchesToProcess) {
      // Bug 3 Fix: Use atomic SQL decrement instead of in-memory subtraction
      await process.batch.update({
        current_quantity: db.sequelize.literal(`current_quantity - ${Number(process.deductQty)}`)
      }, { transaction: t });

      await db.inventory_transaction.create({
        item_id,
        batch_id: process.batch.id,
        transaction_type: 'CONSUME',
        quantity: -process.deductQty,
        notes: notes || "Consumed",
        employee_id: req.user.id,
        lab_id: req.tenant.lab_id,
      }, { transaction: t });
    }

    await t.commit();
    res.json({ message: "Stock consumed successfully" });

    // Trigger StockUpdate Event
    const io = req.app.get("io");
    inventoryEvents.emit("StockUpdate", { item_id, lab_id: req.tenant.lab_id, io });
  } catch (error) {
    await t.rollback();
    console.error("Error consuming stock:", error);
    res.status(error.message.includes("Insufficient") || error.message.includes("not found") ? 400 : 500)
      .json({ message: error.message || "Server error" });
  }
});

// Adjust Stock (e.g., Expired, Damaged, Count correction)
router.post("/adjust", async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { item_id, batch_id, transaction_type, quantity, notes } = req.body;

    if (!item_id || !batch_id || !transaction_type || !quantity || quantity == 0) {
      return res.status(400).json({ message: "Invalid adjustment data" });
    }

    if (!['EXPIRE', 'ADJUST', 'RETURN'].includes(transaction_type)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    const batch = await db.inventory_batch.findOne({
      where: { id: batch_id, item_id, lab_id: req.tenant.lab_id },
      transaction: t
    });

    if (!batch) throw new Error("Batch not found");

    const newQty = Number(batch.current_quantity) + Number(quantity); // quantity can be negative
    if (newQty < 0) {
      throw new Error("Adjustment cannot result in negative stock");
    }

    await batch.update({ current_quantity: newQty }, { transaction: t });

    await db.inventory_transaction.create({
      item_id,
      batch_id,
      transaction_type,
      quantity,
      notes,
      employee_id: req.user.id,
      lab_id: req.tenant.lab_id,
    }, { transaction: t });

    await t.commit();
    res.json({ message: "Stock adjusted successfully", new_quantity: newQty });

    // Trigger StockUpdate Event
    const io = req.app.get("io");
    inventoryEvents.emit("StockUpdate", { item_id, lab_id: req.tenant.lab_id, io });
  } catch (error) {
    await t.rollback();
    console.error("Error adjusting stock:", error);
    res.status(error.message.includes("not found") || error.message.includes("negative") ? 400 : 500)
      .json({ message: error.message || "Server error" });
  }
});

// Get transactions for an item
router.get("/items/:item_id/transactions", async (req, res) => {
  try {
    const { item_id } = req.params;
    const transactions = await db.inventory_transaction.findAll({
      where: { item_id, lab_id: req.tenant.lab_id },
      include: [
        { model: db.employee, as: "employee", attributes: ["id", "username"] },
        { model: db.inventory_batch, as: "batch", attributes: ["id", "batch_number"] }
      ],
      order: [["createdAt", "DESC"]],
      limit: 100
    });
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// --- ALERTS ---

// Low Stock Alert
router.get("/alerts/low-stock", async (req, res) => {
  try {
    // We need to sum current_quantity across batches for each item and compare to min_stock_level
    const items = await db.inventory_item.findAll({
      where: { lab_id: req.tenant.lab_id },
      include: [
        {
          model: db.inventory_batch,
          as: "batches",
          required: false,
          where: { lab_id: req.tenant.lab_id }
        }
      ]
    });

    const lowStockItems = items.filter(item => {
      const itemData = item.toJSON();
      const totalStock = itemData.batches.reduce((sum, batch) => sum + Number(batch.current_quantity), 0);
      return totalStock <= itemData.min_stock_level;
    }).map(item => {
      const itemData = item.toJSON();
      itemData.total_stock = itemData.batches.reduce((sum, batch) => sum + Number(batch.current_quantity), 0);
      return itemData;
    });

    res.json(lowStockItems);
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Expiring Soon Alert
router.get("/alerts/expiring", async (req, res) => {
  try {
    const daysThreshold = parseInt(req.query.days) || 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringBatches = await db.inventory_batch.findAll({
      where: {
        lab_id: req.tenant.lab_id,
        current_quantity: { [Sequelize.Op.gt]: 0 },
        expiration_date: {
          [Sequelize.Op.not]: null,
          [Sequelize.Op.lte]: thresholdDate
        }
      },
      include: [
        { model: db.inventory_item, as: "item", attributes: ["id", "name", "category"] },
        { model: db.supplier, as: "supplier", attributes: ["id", "name"] }
      ],
      order: [["expiration_date", "ASC"]]
    });

    res.json(expiringBatches);
  } catch (error) {
    console.error("Error fetching expiring alerts:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// --- NOTIFICATIONS ---

// Get unread notifications
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await db.inventory_notification.findAll({
      where: {
        lab_id: req.tenant.lab_id,
        status: 'UNREAD'
      },
      order: [["createdAt", "DESC"]]
    });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await db.inventory_notification.findOne({
      where: { id, lab_id: req.tenant.lab_id }
    });

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    await notification.update({ status: 'READ' });
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
