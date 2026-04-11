/**
 * Smart Seeder — Migrate test_component rows to JSON structure_config
 *
 * Reads all existing test_components, converts their rigid columns into
 * the new StructureField JSON format, and writes back to test.structure_config.
 *
 * Usage:  node server/scripts/migrateTestComponentsToJson.js
 *
 * Safe to run multiple times — overwrites structure_config each run.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const db = require("../models");
const { test, test_component, sequelize } = db;

/**
 * Convert a name string into a URL-safe key.
 * "Total Cholesterol (TC)" → "total_cholesterol_tc"
 */
function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}

/**
 * Map the legacy result_type to the new StructureField type.
 */
function mapResultType(resultType) {
    switch (resultType) {
        case "boolean":
            return "options";
        case "range":
        default:
            return "numeric";
    }
}

/**
 * Convert a single test_component row into a StructureField object.
 * @param {Object} comp - Sequelize test_component instance (plain object).
 * @returns {import('../models/types/structureConfig.typedef').StructureField}
 */
function componentToStructureField(comp) {
    const field = {
        key: slugify(comp.name || `component_${comp.id}`),
        label: comp.name || `Component ${comp.id}`,
        type: mapResultType(comp.result_type),
        unit: comp.unit || "",
    };

    // Build the reference range from the existing rigid columns
    const range = {
        gender: comp.gender || null,
        age_min: comp.age_start != null ? Number(comp.age_start) : null,
        age_max: comp.age_end != null ? Number(comp.age_end) : null,
        min: comp.normal_from != null && comp.normal_from !== "" ? Number(comp.normal_from) : null,
        max: comp.normal_to != null && comp.normal_to !== "" ? Number(comp.normal_to) : null,
        panic_min: comp.c_low != null && comp.c_low !== "" ? Number(comp.c_low) : null,
        panic_max: comp.c_high != null && comp.c_high !== "" ? Number(comp.c_high) : null,
    };

    field.reference_ranges = [range];

    // If there was a freeform reference_range text, store it as a secondary hint
    if (comp.reference_range) {
        field._legacy_reference_text = comp.reference_range;
    }

    // For "options" type, provide default choices
    if (field.type === "options") {
        field.options = ["Positive", "Negative"];
    }

    return field;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  Smart Seeder — test_component → structure_config   ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");

    try {
        await sequelize.authenticate();
        console.log("✅ Database connection established.\n");
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    }

    // 1. Fetch all test_components grouped by test_id
    const allComponents = await test_component.findAll({
        order: [["test_id", "ASC"], ["id", "ASC"]],
        raw: true,
    });

    if (allComponents.length === 0) {
        console.log("ℹ️  No test_components found. Nothing to migrate.");
        process.exit(0);
    }

    // Group by test_id
    const grouped = {};
    for (const comp of allComponents) {
        if (!grouped[comp.test_id]) grouped[comp.test_id] = [];
        grouped[comp.test_id].push(comp);
    }

    const testIds = Object.keys(grouped);
    console.log(`📊 Found ${allComponents.length} components across ${testIds.length} tests.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const testId of testIds) {
        const components = grouped[testId];

        try {
            // 2. Convert each component to the new JSON format
            const structureConfig = components.map(componentToStructureField);

            // Ensure unique keys within the same test
            const seenKeys = new Set();
            for (const field of structureConfig) {
                let baseKey = field.key;
                let counter = 1;
                while (seenKeys.has(field.key)) {
                    field.key = `${baseKey}_${counter++}`;
                }
                seenKeys.add(field.key);
            }

            // 3. Determine test type
            const testType = structureConfig.length > 1 ? "panel" : "single";

            // 4. Update the parent test row
            await test.update(
                {
                    structure_config: structureConfig,
                    type: testType,
                },
                { where: { id: testId } }
            );

            console.log(
                `  ✅ Test #${testId} — migrated ${components.length} component(s) → type: ${testType}`
            );
            successCount++;
        } catch (err) {
            console.error(`  ❌ Test #${testId} — FAILED: ${err.message}`);
            failCount++;
        }
    }

    // 5. Summary
    console.log("\n══════════════════════════════════════════════════════");
    console.log(`  Migration complete!`);
    console.log(`  ✅ Succeeded: ${successCount}`);
    console.log(`  ❌ Failed:    ${failCount}`);
    console.log(`  📊 Total:     ${testIds.length}`);
    console.log("══════════════════════════════════════════════════════\n");

    await sequelize.close();
    process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error("💥 Unexpected error:", err);
    process.exit(1);
});
