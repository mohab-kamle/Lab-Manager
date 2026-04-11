const EventEmitter = require('events');
const { Op } = require('sequelize');
const db = require('../models');

class InventoryEventEmitter extends EventEmitter {}
const inventoryEvents = new InventoryEventEmitter();

// --- LOW STOCK Threshold Evaluator ---
// Fires when stock is received, consumed, or adjusted
inventoryEvents.on('StockUpdate', async ({ item_id, lab_id, io }) => {
  try {
    // 1. Calculate the new total quantity for the item
    const item = await db.inventory_item.findOne({
      where: { id: item_id, lab_id },
      include: [
        {
          model: db.inventory_batch,
          as: "batches",
          required: false,
          where: { lab_id }
        }
      ]
    });

    if (!item) return;

    const totalStock = item.batches.reduce((sum, batch) => sum + Number(batch.current_quantity), 0);

    // 2. Evaluate against min_stock_level
    if (totalStock <= Number(item.min_stock_level)) {
      // Check if there's already an unread LOW_STOCK notification for this item
      // to avoid flooding the user with duplicate alerts
      const existingNotification = await db.inventory_notification.findOne({
        where: {
          item_id: item.id,
          alert_type: 'LOW_STOCK',
          status: 'UNREAD',
          lab_id: lab_id
        }
      });

      if (existingNotification) return; // Don't create duplicate unread notifications

      // Create notification
      const notification = await db.inventory_notification.create({
        item_id: item.id,
        alert_type: 'LOW_STOCK',
        message: `Low Stock Alert: ${item.name} has ${totalStock} ${item.unit} remaining (Min: ${item.min_stock_level}).`,
        status: 'UNREAD',
        lab_id: lab_id
      });

      // 3. Emit real-time alert via Socket.io to the lab's room
      if (io) {
        io.to(`lab_${lab_id}`).emit('low_stock_alert', {
          notification_id: notification.id,
          item_id: item.id,
          item_name: item.name,
          current_stock: totalStock,
          unit: item.unit,
          message: notification.message
        });
      }
    }
  } catch (error) {
    console.error("Error evaluating stock threshold:", error);
  }
});

// --- EXPIRING SOON & EXPIRED Batch Checker ---
// Runs on server startup and daily to find batches approaching or past expiration.
// Creates notifications and emits Socket.io events for each affected lab.
async function checkExpiringBatches(io) {
  try {
    console.log("🔔 Running expiry check for inventory batches...");

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // --- EXPIRING SOON: batches expiring within the next 30 days ---
    const expiringBatches = await db.inventory_batch.findAll({
      where: {
        current_quantity: { [Op.gt]: 0 },
        expiration_date: {
          [Op.not]: null,
          [Op.gt]: now,              // Not yet expired
          [Op.lte]: thirtyDaysFromNow // But within 30 days
        }
      },
      include: [
        { model: db.inventory_item, as: "item", attributes: ["id", "name", "unit"] }
      ]
    });

    let expiringCount = 0;
    for (const batch of expiringBatches) {
      // Skip if there's already an unread EXPIRING_SOON notification for this batch
      const existing = await db.inventory_notification.findOne({
        where: {
          batch_id: batch.id,
          alert_type: 'EXPIRING_SOON',
          status: 'UNREAD',
          lab_id: batch.lab_id
        }
      });
      if (existing) continue;

      const daysLeft = Math.ceil((new Date(batch.expiration_date) - now) / (1000 * 60 * 60 * 24));
      const itemName = batch.item?.name || 'Unknown Item';

      const notification = await db.inventory_notification.create({
        item_id: batch.item_id,
        batch_id: batch.id,
        alert_type: 'EXPIRING_SOON',
        message: `Expiring Soon: Batch "${batch.batch_number}" of ${itemName} expires in ${daysLeft} day(s) (${new Date(batch.expiration_date).toLocaleDateString()}).`,
        status: 'UNREAD',
        lab_id: batch.lab_id
      });

      // Emit real-time alert
      if (io) {
        io.to(`lab_${batch.lab_id}`).emit('expiring_soon_alert', {
          notification_id: notification.id,
          item_id: batch.item_id,
          item_name: itemName,
          batch_number: batch.batch_number,
          expiration_date: batch.expiration_date,
          days_left: daysLeft,
          message: notification.message
        });
      }
      expiringCount++;
    }

    // --- EXPIRED: batches past their expiration date ---
    const expiredBatches = await db.inventory_batch.findAll({
      where: {
        current_quantity: { [Op.gt]: 0 },
        expiration_date: {
          [Op.not]: null,
          [Op.lte]: now // Already expired
        }
      },
      include: [
        { model: db.inventory_item, as: "item", attributes: ["id", "name", "unit"] }
      ]
    });

    let expiredCount = 0;
    for (const batch of expiredBatches) {
      // Skip if there's already an unread EXPIRED notification for this batch
      const existing = await db.inventory_notification.findOne({
        where: {
          batch_id: batch.id,
          alert_type: 'EXPIRED',
          status: 'UNREAD',
          lab_id: batch.lab_id
        }
      });
      if (existing) continue;

      const itemName = batch.item?.name || 'Unknown Item';

      const notification = await db.inventory_notification.create({
        item_id: batch.item_id,
        batch_id: batch.id,
        alert_type: 'EXPIRED',
        message: `Expired: Batch "${batch.batch_number}" of ${itemName} expired on ${new Date(batch.expiration_date).toLocaleDateString()}. Qty remaining: ${batch.current_quantity}.`,
        status: 'UNREAD',
        lab_id: batch.lab_id
      });

      // Emit real-time alert
      if (io) {
        io.to(`lab_${batch.lab_id}`).emit('expired_alert', {
          notification_id: notification.id,
          item_id: batch.item_id,
          item_name: itemName,
          batch_number: batch.batch_number,
          expiration_date: batch.expiration_date,
          message: notification.message
        });
      }
      expiredCount++;
    }

    console.log(`🔔 Expiry check complete: ${expiringCount} expiring soon, ${expiredCount} expired notifications created.`);
  } catch (error) {
    console.error("Error during expiry check:", error);
  }
}

module.exports = inventoryEvents;
module.exports.checkExpiringBatches = checkExpiringBatches;
