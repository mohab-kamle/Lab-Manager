/**
 * Phase 1 Verification — Calculation Engine Tests
 *
 * Standalone script that validates the calculation engine works correctly
 * without needing a database connection.
 *
 * Usage:  node server/scripts/verifyPhase1.js
 */

const { calculateTestResults, safeEvaluate } = require("../services/calculationEngine");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        passed++;
    } else {
        console.error(`  ❌ ${testName}`);
        failed++;
    }
}

function assertApprox(actual, expected, testName, tolerance = 0.01) {
    const ok = Math.abs(actual - expected) < tolerance;
    assert(ok, `${testName} (expected ${expected}, got ${actual})`);
}

// ─── Test Suite ────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║       Phase 1 Verification — Calculation Engine     ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

// ─── 1. Safe Expression Evaluator ──────────────────────────────────
console.log("1. Safe Expression Evaluator (safeEvaluate):\n");

assertApprox(safeEvaluate("2 + 3", {}), 5, "Simple addition");
assertApprox(safeEvaluate("10 - 4", {}), 6, "Simple subtraction");
assertApprox(safeEvaluate("3 * 7", {}), 21, "Simple multiplication");
assertApprox(safeEvaluate("20 / 4", {}), 5, "Simple division");
assertApprox(safeEvaluate("2 + 3 * 4", {}), 14, "Operator precedence (2+3*4=14)");
assertApprox(safeEvaluate("(2 + 3) * 4", {}), 20, "Parentheses override precedence");
assertApprox(safeEvaluate("-5 + 3", {}), -2, "Unary minus");
assertApprox(safeEvaluate("x + y", { x: 10, y: 20 }), 30, "Variable substitution");
assertApprox(
    safeEvaluate("cholesterol - hdl - (triglycerides / 5)", {
        cholesterol: 250,
        hdl: 45,
        triglycerides: 150,
    }),
    175,
    "LDL Friedewald formula"
);

// Division by zero
try {
    safeEvaluate("10 / 0", {});
    assert(false, "Division by zero should throw");
} catch (err) {
    assert(err.message.includes("Division by zero"), "Division by zero throws error");
}

// Unknown variable
try {
    safeEvaluate("unknown_var + 1", {});
    assert(false, "Unknown variable should throw");
} catch (err) {
    assert(err.message.includes("Unknown variable"), "Unknown variable throws error");
}

// Invalid characters
try {
    safeEvaluate("2 + eval('bad')", {});
    assert(false, "eval() in formula should throw");
} catch (err) {
    assert(true, "Injection attempt rejected");
}

// ─── 2. calculateTestResults ───────────────────────────────────────
console.log("\n2. calculateTestResults (full pipeline):\n");

// Lipid panel simulation
const lipidStructure = [
    { key: "cholesterol", label: "Total Cholesterol", type: "numeric", unit: "mg/dL" },
    { key: "hdl", label: "HDL", type: "numeric", unit: "mg/dL" },
    { key: "triglycerides", label: "Triglycerides", type: "numeric", unit: "mg/dL" },
    {
        key: "ldl",
        label: "LDL (Calculated)",
        type: "calculated",
        unit: "mg/dL",
        formula: "cholesterol - hdl - (triglycerides / 5)",
    },
    { key: "section_header", label: "Notes", type: "header" },
];

const lipidInputs = { cholesterol: 250, hdl: 45, triglycerides: 150 };
const lipidResult = calculateTestResults(lipidInputs, lipidStructure);

assertApprox(lipidResult.results.cholesterol, 250, "Passthrough: cholesterol");
assertApprox(lipidResult.results.hdl, 45, "Passthrough: hdl");
assertApprox(lipidResult.results.triglycerides, 150, "Passthrough: triglycerides");
assertApprox(lipidResult.results.ldl, 175, "Calculated: LDL = 175");
assert(lipidResult.errors.length === 0, "No errors for valid input");
assert(!("section_header" in lipidResult.results), "Header fields excluded from results");

// Missing input for a field
const partialResult = calculateTestResults({ cholesterol: 200 }, lipidStructure);
assert(partialResult.results.hdl === null, "Missing input returns null");
assert(partialResult.errors.length > 0, "Errors reported for missing formula vars");

// Calculated field without formula
const noFormulaStructure = [
    { key: "bad_calc", label: "Bad", type: "calculated" },
];
const noFormulaResult = calculateTestResults({}, noFormulaStructure);
assert(
    noFormulaResult.errors.some((e) => e.includes("no formula")),
    "Error for calculated field without formula"
);

// Non-array structure
const invalidResult = calculateTestResults({}, "not_an_array");
assert(
    invalidResult.errors.some((e) => e.includes("not an array")),
    "Error for non-array structure_config"
);

// ─── 3. JSON Schema Validation ─────────────────────────────────────
console.log("\n3. JSON Schema Shape Validation:\n");

const sampleConfig = [
    {
        key: "glucose",
        label: "Fasting Glucose",
        type: "numeric",
        unit: "mg/dL",
        loinc: "1558-6",
        reference_ranges: [
            { gender: null, age_min: 18, age_max: 120, min: 70, max: 100, panic_min: 40, panic_max: 400 },
        ],
    },
    {
        key: "hba1c",
        label: "HbA1c",
        type: "numeric",
        unit: "%",
        reference_ranges: [
            { gender: null, age_min: null, age_max: null, min: 4.0, max: 5.6, panic_min: null, panic_max: 14.0 },
        ],
    },
];

assert(Array.isArray(sampleConfig), "structure_config is an array");
assert(sampleConfig.every((f) => typeof f.key === "string"), "All fields have string keys");
assert(sampleConfig.every((f) => typeof f.label === "string"), "All fields have string labels");
assert(
    sampleConfig.every((f) => ["numeric", "text", "options", "calculated", "header"].includes(f.type)),
    "All fields have valid type"
);
assert(
    sampleConfig[0].reference_ranges.every(
        (r) => "min" in r && "max" in r && "panic_min" in r && "panic_max" in r
    ),
    "Reference ranges have min/max/panic fields"
);

// ─── Summary ───────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════");
console.log(`  Verification complete!`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log("══════════════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
