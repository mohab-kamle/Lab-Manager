# Architectural Design Patterns: Lab-Manager System (Cura)

The following patterns have been implemented across the architecture to ensure scalability, maintainability, and loose coupling.

---

## 1. Observer Pattern (Event-Driven Synchronization)

### Implementation Summary

The system utilizes the **Observer Pattern** to decouple state changes from the notification and real-time alerting systems. By leveraging Node.js's native `EventEmitter` on the backend and **Custom Browser Events** on the front-end, we ensure that core logic remains isolated from secondary side effects like UI updates or real-time alerts.

### Project Examples

#### [Backend] Inventory Events
- **Location:** [inventoryEvents.js](file:///home/zaid/Project/Lab-Manager/server/services/inventoryEvents.js)
- **Component:** `InventoryEventEmitter`

When a stock update occurs, a `StockUpdate` event is emitted. The `InventoryEventEmitter` (the Subject) notifies its registered listeners (the Observers) to evaluate low stock and emit Socket.io alerts without blocking the main inventory transaction.

```javascript
// The Subject (in inventoryEvents.js)
const inventoryEvents = new InventoryEventEmitter();

// The Observer
inventoryEvents.on("StockUpdate", async ({ item_id, lab_id, io }) => {
  // Logic to evaluate low stock and emit real-time Socket.io alerts
});
```

#### [Front-end] UI Synchronization
- **Location:** [MainNavBar.jsx](file:///home/zaid/Project/Lab-Manager/client/src/components/layout/MainNavBar.jsx)
- **Component:** `MainNavBar`

The navigation bar acts as an **Observer** to window-level custom events. When the inventory state changes (e.g., via a WebSocket message received in a parent layout), it triggers a UI update in the Navbar to refresh the notification badge count dynamically.

```javascript
useEffect(() => {
  const handleNotificationUpdate = () => fetchNotifications();
  // Registering the Observer
  window.addEventListener('inventory-notification-update', handleNotificationUpdate);
  return () => window.removeEventListener('inventory-notification-update', handleNotificationUpdate);
}, []);
```

### Benefits

- **Loose Coupling:** Inventory logic doesn't need to depend on the notification service or specific UI components.
- **Scalability:** New observers (e.g., Email alerts, SMS logging, or multiple UI widgets) can be added without modifying the original event source.
- **Real-time Responsiveness:** Ensures the UI stays in sync with backend state changes without expensive polling.

---

## 2. Strategy Pattern (Pluggable Logic)

### Implementation Summary

The **Strategy Pattern** is applied to encapsulate interchangeable algorithms or configurations. This allows the system to switch behavior at runtime based on environment, provider configuration, or data types without modifying the consuming code.

### Project Examples

#### [Backend] Payment Gateways
- **Location:** [paymentsGateway.js](file:///home/zaid/Project/Lab-Manager/server/routes/paymentsGateway.js)
- **Component:** Payment Integration Layer

The architecture defines a consistent "Strategy" for handling financial transactions, which includes Intention Creation and Verification. This allows the system to support different payment providers (currently Paymob) while keeping the core billing logic uniform.

```javascript
// Strategy interface logic (conceptual)
router.post("/create-intention", async (req, res) => {
  // 1. Prepare standardized data
  // 2. Execute gateway-specific strategy (e.g., Paymob Intention API)
  // 3. Handle standardized response
});
```

#### [Front-end] Dynamic UI Rendering
- **Location:** [TransactionStatusBadge.jsx](file:///home/zaid/Project/Lab-Manager/client/src/components/ui/TransactionStatusBadge.jsx)
- **Component:** `TransactionStatusBadge`

The component uses a **Strategy Map** to determine visual configuration (color, label) of a badge based on the transaction's process type. This avoids complex nested conditionals and makes the UI extensible for new transaction types.

```javascript
const getBadgeConfig = (type) => {
  switch (type?.toLowerCase()) {
    case 'payment': return { bg: 'success', text: 'Payment' };
    case 'refund':  return { bg: 'warning', text: 'Refund' };
    case 'due':     return { bg: 'danger', text: 'Due' };
    default:        return { bg: 'secondary', text: type };
  }
};
```

### Benefits

- **Interchangeability:** Easily swap payment providers or UI styles by implementing a new strategy.
- **Maintainability:** Encapsulates provider-specific or type-specific logic in isolated blocks, preventing "spaghetti" conditionals.
- **Clean Code:** Consuming components/routes only care about the standardized interface, not the underlying implementation details.

---

## 3. Factory Pattern (Centralized Object Creation)

### Implementation Summary

The **Factory Pattern** is used to manage the complex creation and transformation of objects. Instead of manually instantiating or parsing data across the app, a centralized factory handles the logic, ensuring consistency and reducing duplication.

### Project Examples

#### [Backend] Model Initialization
- **Location:** [init-models.js](file:///home/zaid/Project/Lab-Manager/server/models/init-models.js)
- **Component:** `initModels(sequelize)`

The factory takes a `sequelize` instance and "manufactures" the entire model layer (50+ models), including established relational graphs and foreign key constraints.

```javascript
function initModels(sequelize) {
  var admin = _admin(sequelize, DataTypes);
  var patient = _patient(sequelize, DataTypes);
  // ... 50+ models instantiated here

  // Associations are 'manufactured' here
  patient.hasMany(bill, { as: "bills", foreignKey: "patient_id" });

  return { admin, patient, ... };
}
```

#### [Front-end] Dynamic Settings Parsing
- **Location:** [LabManagement.jsx](file:///home/zaid/Project/Lab-Manager/client/src/pages/lab/LabManagement.jsx)
- **Component:** `LabManagement` (Settings Parser)

The system uses a **Factory-style** loop to transform raw database rows into typed application state. It "manufactures" the correct data type (Boolean, JSON, or String) based on a metadata flag.

```javascript
labSettings.forEach(setting => {
  if (setting.setting_type === 'json') {
    settingsMap[setting.setting_key] = JSON.parse(setting.setting_value);
  } else if (setting.setting_type === 'boolean') {
    settingsMap[setting.setting_key] = setting.setting_value === 'true';
  } else {
    settingsMap[setting.setting_key] = setting.setting_value;
  }
});
```

### Benefits

- **Centralized Control:** Simplifies management of complex initialization or parsing logic in a single source of truth.
- **Consistency:** Ensures all models or settings are manufactured with the same configuration across the app.
- **Code Reuse:** Prevents duplication of parsing logic and complex database association setup.

---

**I have audited the Lab-Manager (Cura) codebase to identify and document the core design patterns that ensure the system's scalability, maintainability, and architectural integrity across both Backend and Front-end layers.**
