/**
 * One-time cleanup: drop stale FK constraint and recreate global_test_catalog
 * with the correct charset.
 *
 * Usage:  node server/scripts/fixGlobalTestCatalogFK.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const db = require("../models");

async function fix() {
    try {
        await db.sequelize.authenticate();
        console.log("✅ Connected to database.\n");

        // 1. Drop the stale FK constraint on test.global_test_id (if it exists)
        try {
            const [constraints] = await db.sequelize.query(
                `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'test'
           AND CONSTRAINT_TYPE = 'FOREIGN KEY'
           AND CONSTRAINT_NAME LIKE '%global_test%'`
            );

            for (const row of constraints) {
                console.log(`🗑️  Dropping FK constraint: ${row.CONSTRAINT_NAME}`);
                await db.sequelize.query(
                    `ALTER TABLE \`test\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
                );
                console.log(`✅ Dropped: ${row.CONSTRAINT_NAME}`);
            }

            if (constraints.length === 0) {
                console.log("ℹ️  No stale FK constraints found on test.global_test_id");
            }
        } catch (err) {
            console.warn("⚠️  Error dropping FK constraint:", err.message);
        }

        // 2. Drop the stale global_test_catalog table (if it exists with wrong charset)
        try {
            await db.sequelize.query("DROP TABLE IF EXISTS `global_test_catalog`");
            console.log("✅ Dropped global_test_catalog table (will be recreated on sync).\n");
        } catch (err) {
            console.warn("⚠️  Error dropping global_test_catalog:", err.message);
        }

        // 3. Also drop the global_test_id column if it exists with wrong type
        try {
            const [columns] = await db.sequelize.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'test'
           AND COLUMN_NAME = 'global_test_id'`
            );

            if (columns.length > 0) {
                await db.sequelize.query("ALTER TABLE `test` DROP COLUMN `global_test_id`");
                console.log("✅ Dropped test.global_test_id column (will be recreated on sync).");
            }
        } catch (err) {
            console.warn("⚠️  Error dropping global_test_id column:", err.message);
        }

        console.log("\n🎉 Cleanup complete! Restart your server now.");
    } catch (err) {
        console.error("❌ Fatal error:", err.message);
    } finally {
        await db.sequelize.close();
        process.exit(0);
    }
}

fix();
