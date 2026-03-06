const EventEmitter = require('events');
const db = require('../models');

class InventoryEventEmitter extends EventEmitter {}
const inventoryEvents = new InventoryEventEmitter();

// Threshold Evaluator
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

module.exports = inventoryEvents;
