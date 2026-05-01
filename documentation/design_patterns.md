# Architectural Design Patterns: Lab-Manager System (Cura)

The following patterns have been implemented across the backend architecture:

---

## 1. Observer Pattern (Event-Driven Notifications)

### Implementation Summary

The system utilizes the **Observer Pattern** to decouple inventory state changes from the notification and real-time alerting system. By leveraging Node.js's native `EventEmitter`, we ensure that the core inventory logic (receiving, consuming, or adjusting stock) doesn't need to know about WebSockets, Socket.io, or the notification database schema.

### Project Example

- **Location:** [inventoryEvents.js](file:///home/zaid/Project/Lab-Manager/server/services/inventoryEvents.js)
- **Component:** `InventoryEventEmitter`

When a stock update occurs in any part of the application, a `StockUpdate` event is emitted. The `InventoryEventEmitter` (the Subject) notifies its registered listeners (the Observers).

```javascript
// The Subject (in inventoryEvents.js)
const inventoryEvents = new InventoryEventEmitter();

// The Observer
inventoryEvents.on("StockUpdate", async ({ item_id, lab_id, io }) => {
  // Logic to evaluate low stock and emit real-time Socket.io alerts
  // and create persistent database notifications.
});
```

### Benefits

- **Loose Coupling:** Inventory routes don't need to depend on the notification service.
- **Scalability:** New observers (e.g., Email alerts, SMS logging) can be added without modifying the original stock update logic.

---

## 2. Strategy Pattern (Interchangeable Payment Gateways)

### Implementation Summary

The **Strategy Pattern** is applied to the payment processing module. The architecture defines a consistent "Strategy" for handling financial transactions, which includes Intention Creation, Webhook Processing, and Transaction Verification. This allows the system to support different payment providers (currently Paymob) while keeping the billing logic uniform.

### Project Example

- **Location:** [paymentsGateway.js](file:///home/zaid/Project/Lab-Manager/server/routes/paymentsGateway.js)
- **Component:** Payment Integration Layer

The system uses a common interface for different payment "strategies" based on the environment and provider configuration.

```javascript
// Strategy interface logic (conceptual)
router.post("/create-intention", async (req, res) => {
  // 1. Prepare standardized data
  // 2. Execute gateway-specific strategy (e.g., Paymob Intention API)
  // 3. Handle standardized response
});
```

### Benefits

- **Interchangeability:** We can easily add new payment strategies (e.g., Stripe, PayPal) by implementing the same set of endpoints and handlers.
- **Maintainability:** Encapsulates provider-specific logic (like Paymob's HMAC verification or specific JSON structures) within isolated functions.

---

## 3. Factory Pattern (Centralized Model Initialization)

### Implementation Summary

The **Factory Pattern** is used to manage the complex creation and association of over 50 database models. Instead of manually importing and linking models across the application, a centralized `initModels` factory function handles the instantiation and establishes the relational graph.

### Project Example

- **Location:** [init-models.js](file:///home/zaid/Project/Lab-Manager/server/models/init-models.js)
- **Component:** `initModels(sequelize)`

The factory takes a `sequelize` instance and "manufactures" the entire model layer, including foreign key constraints and polymorphic-style associations.

```javascript
// The Factory Function
function initModels(sequelize) {
  var admin = _admin(sequelize, DataTypes);
  var patient = _patient(sequelize, DataTypes);
  // ... 50+ models instantiated here

  // Associations are also 'manufactured' here
  patient.hasMany(bill, { as: "bills", foreignKey: "patient_id" });

  return { admin, patient, ... };
}
```

### Benefits

- **Centralized Control:** Simplifies the management of complex database relationships.
- **Consistency:** Ensures that all models are initialized with the correct Sequelize configuration and data types consistently across the app.
- **Clean Code:** The rest of the application simply imports the `db` object (the factory's output) without worrying about underlying initialization order.

---

**I have audited the Lab-Manager (Cura) codebase to identify and document the core design patterns that ensure the system's scalability, maintainability, and loose coupling.**
