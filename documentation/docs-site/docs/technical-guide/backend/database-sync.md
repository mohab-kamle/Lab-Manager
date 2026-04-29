# Database Synchronization Guide

This guide explains how the automatic database synchronization works in the LabManager application.

## 🚀 Automatic Sync (Recommended)

The server automatically synchronizes the database schema when it starts up. This happens in `server/index.js` and ensures that:

- ✅ All model changes are automatically applied
- ✅ Existing data is preserved (using `alter: true`)
- ✅ New tables are created if they don't exist
- ✅ New columns are added to existing tables
- ✅ Database connection is verified

### How it works

1. **Server Startup**: When you run `npm start`, the server automatically:
   - Connects to the database
   - Runs `db.sequelize.sync({ alter: true })`
   - Verifies key tables exist
   - Starts the HTTP server

2. **Safe Mode**: Uses `alter: true` which:
   - ✅ Preserves all existing data
   - ✅ Adds new columns/tables
   - ✅ Modifies existing columns safely
   - ❌ Never drops tables or data

## 🛠️ Manual Sync Options

### 1. Normal Sync (Safe)

```bash
# Using npm script
npm run db:sync

# Or directly
node syncDatabase.js
```

### 2. Force Sync (Development Only)

```bash
# Using npm script
npm run db:sync:force

# Or directly
node syncDatabase.js force
```

⚠️ **WARNING**: Force sync will drop all tables and recreate them, deleting all data!

### 3. Check Database Status

```bash
# Using npm script
npm run db:check

# Or directly
node syncDatabase.js check
```

## 🔧 Environment Variables

You can control sync behavior with environment variables:

```bash
# Force sync in development (dangerous!)
FORCE_SYNC=true npm start

# Normal sync (default)
npm start
```

## 📊 What Gets Synced

The system automatically syncs all models defined in `server/models/`:

### Core Tables

- `patients` - Patient information
- `tests` - Laboratory tests
- `cultures` - Culture tests
- `medical_reports` - Medical reports
- `test_groups` - Test group configurations
- `employees` - Staff members
- `admins` - Administrators
- `chemists` - Laboratory chemists
- `receptionists` - Front desk staff
- `bills` - Invoices and billing
- `antibiotics` - Antibiotic definitions
- `medical_report_has_culture_antibiotic` - Culture antibiotic results

### Junction Tables

- All many-to-many relationship tables
- Test components and field options
- Package and offer relationships

## 🛡️ Safety Features

### Production Protection

- Force sync is **disabled** in production
- Only `alter: true` mode is allowed in production
- Environment checks prevent accidental data loss

### Error Handling

- Connection failures are caught and reported
- Schema conflicts are detected and logged
- Helpful error messages guide troubleshooting

### Verification

- Key tables are verified after sync
- Connection status is checked
- Table existence is confirmed

## 🔍 Troubleshooting

### Common Issues

1. **Connection Failed**

   ```
   ❌ Database connection failed: ECONNREFUSED
   💡 Tip: Make sure your database server is running
   ```

2. **Authentication Error**

   ```
   ❌ Database connection failed: ER_ACCESS_DENIED_ERROR
   💡 Tip: Check your database credentials in config/config.js
   ```

3. **Schema Mismatch**

   ```
   ❌ Database sync failed: Unknown column
   💡 Tip: This might be a schema mismatch. Consider using FORCE_SYNC=true in development
   ```

4. **Primary Key Conflict**

   ```
   ❌ Database sync failed: Multiple primary key defined
   💡 Tip: Primary key conflict detected. This has been automatically fixed.
   ```

   **Solution**: The system automatically detects and fixes primary key conflicts in junction tables like `medical_report_has_culture`.

### Solutions

1. **Check Database Server**

   ```bash
   # For MySQL
   sudo systemctl status mysql
   
   # For local development
   mysql -u root -p
   ```

2. **Verify Configuration**

   ```bash
   # Check config file
   cat server/config/config.js
   
   # Check environment variables
   echo $DATABASE_URL
   ```

3. **Reset Database (Development Only)**

   ```bash
   # WARNING: This deletes all data!
   npm run db:sync:force
   ```

## 📝 Best Practices

### Development

1. Use automatic sync for most changes
2. Use force sync only when needed (new project setup)
3. Always backup data before force sync
4. Test schema changes in development first

### Production

1. Never use force sync
2. Always test migrations in development
3. Monitor sync logs for any issues
4. Keep database backups before deployments

### Model Changes

1. Add new columns with default values when possible
2. Use `allowNull: true` for new required fields
3. Test model changes locally first
4. Document breaking changes

## 🎯 Summary

The automatic database synchronization ensures that:

- ✅ **Zero Configuration**: Works out of the box
- ✅ **Data Safe**: Never loses existing data
- ✅ **Automatic**: No manual intervention needed
- ✅ **Production Ready**: Safe for live environments
- ✅ **Flexible**: Manual options available when needed

Your database will always stay in sync with your models! 🎉
