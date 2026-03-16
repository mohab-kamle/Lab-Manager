# 🧩 Sequelize Models & Migrations Workflow

---

> **Purpose:** > This document explains how we handle database schema changes safely and consistently using Sequelize **migrations** (instead of `sequelize.sync()`).  
> Every team member should follow this workflow to keep both code and database aligned.

---

## ⚙️ What’s the Difference?

| Layer        | Tool              | Affects       | Description                                              |
| ------------ | ----------------- | ------------- | -------------------------------------------------------- |
| **Code**     | `models/*.js`     | Sequelize ORM | Defines how our app _understands_ the database structure |
| **Database** | `migrations/*.js` | MySQL schema  | Defines how the actual database _evolves_ over time      |

✅ Migrations apply the schema changes.  
✅ Models describe those changes in code.  
🚫 They **do not automatically update each other**.

---

## 🧠 The Correct Workflow

Follow this exact order whenever you add or modify a table, column, or relation.

### 1. Update the Model

Edit or create your Sequelize model under `/models`.  
Example:

```js
// models/employee.js
module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define("Employee", {
    name: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: "active",
    },
  });
  return Employee;
};
```

---

### 2. Create a Migration

Generate a migration file that reflects the same change:

```bash
npx sequelize-cli migration:generate --name add-status-to-employee
```

This creates a timestamped file in `/migrations`.

Edit the file:

```js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Employees", "status", {
      type: Sequelize.STRING,
      defaultValue: "active",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Employees", "status");
  },
};
```

---

### 3. Run the Migration

Run the migration **inside the backend container** to apply it to the MySQL DB:

```bash
npx sequelize-cli db:migrate
```

> This updates the database structure and logs the migration in the `SequelizeMeta` table, so it won’t re-run in future builds.

---

### 4. Verify

Check the DB or use Sequelize models in your app to confirm the change:

```js
const Employee = require("./models").Employee;
await Employee.create({ name: "Mohab", status: "active" });
```

Everything should now work — your model matches the DB schema.

---

## 🐳 Docker Integration

When using Docker Compose (backend + MySQL):

- The backend service should first **create the schema** if missing:

  ```yaml
  command: sh -c "npx sequelize-cli db:create && npx sequelize-cli db:migrate && npm run dev"
  ```

- Sequelize will automatically skip migrations that were already applied (tracked in `SequelizeMeta`).

This ensures:

- The DB schema is created if it doesn’t exist.
- All migrations are applied in the correct order.
- The app starts only after the DB is ready.

---

## 🚫 Avoid Using `.sync()` in Production

`sequelize.sync()` is only allowed in **development mode** for testing purposes.

It can:

- Drop tables accidentally.
- Cause mismatched schema issues.
- Lose data if used with `force: true`.

For production and shared environments, always use **migrations**.

---

## 🧩 Rollbacks (If Something Breaks)

If a migration introduces an issue, rollback safely:

```bash
npx sequelize-cli db:migrate:undo
```

Or rollback everything:

```bash
npx sequelize-cli db:migrate:undo:all
```

Then fix the migration, regenerate it, and rerun `db:migrate`.

---

## ⚠️ Common Mistakes & Gotchas

- **Forgetting the `down` function:** Always write a `down` function in your migration. If you need to roll back, a missing `down` function will cause the undo to fail, leaving your database in an inconsistent state.

- **Model/Table Name Mismatch:** Sequelize models are **singular** (e.g., `Employee`) but the tables they create are **plural** (e.g., `Employees`). Notice the migration `queryInterface` commands use the plural table name (`'Employees'`). Mismatching this is the most common source of "table not found" errors.

- **Container Timing Issues:** In Docker, your `backend` container might start _before_ the `mysql` container is fully ready to accept connections. Your `command` should include a wait-script or retry logic to ensure the DB is available before running `db:create` or `db:migrate`.

- **Manual DB Edits:** Never edit the database schema manually (e.g., in MySQL Workbench). All changes _must_ go through a migration file, otherwise, other developers' environments and the production environment will break.

---

## ✅ Summary

**Always:**

1.  Edit the model.
2.  Generate a migration (with `up` and `down`).
3.  Run `db:migrate`.
4.  Verify.

**Never:**

- Rely on `sequelize.sync()` in production.
- Edit database structure manually.

---
