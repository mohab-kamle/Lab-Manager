/**
 * @file Type definitions for the test structure_config JSON column.
 * These types describe the schema stored in test.structure_config.
 *
 * ─── Example structure_config ───────────────────────────────────────
 * [
 *   {
 *     "key": "cholesterol",
 *     "label": "Total Cholesterol",
 *     "type": "numeric",
 *     "unit": "mg/dL",
 *     "loinc": "2093-3",
 *     "reference_ranges": [
 *       { "gender": null, "age_min": 18, "age_max": 120, "min": 0, "max": 200, "panic_min": null, "panic_max": 300 }
 *     ]
 *   },
 *   {
 *     "key": "hdl",
 *     "label": "HDL Cholesterol",
 *     "type": "numeric",
 *     "unit": "mg/dL",
 *     "reference_ranges": [
 *       { "gender": "Male",   "age_min": 18, "age_max": 120, "min": 40, "max": 60, "panic_min": null, "panic_max": null },
 *       { "gender": "Female", "age_min": 18, "age_max": 120, "min": 50, "max": 60, "panic_min": null, "panic_max": null }
 *     ]
 *   },
 *   {
 *     "key": "ldl",
 *     "label": "LDL (Calculated)",
 *     "type": "calculated",
 *     "unit": "mg/dL",
 *     "formula": "cholesterol - hdl - (triglycerides / 5)",
 *     "reference_ranges": [
 *       { "gender": null, "age_min": 18, "age_max": 120, "min": 0, "max": 100, "panic_min": null, "panic_max": 190 }
 *     ]
 *   }
 * ]
 * ────────────────────────────────────────────────────────────────────
 */

/**
 * A single reference range entry, supporting gender- and age-specific ranges.
 *
 * @typedef {Object} ReferenceRange
 * @property {'Male'|'Female'|null} gender  - Gender this range applies to, or null for all.
 * @property {number|null} age_min          - Minimum age (inclusive), or null for no lower bound.
 * @property {number|null} age_max          - Maximum age (inclusive), or null for no upper bound.
 * @property {number|null} min              - Normal range lower bound.
 * @property {number|null} max              - Normal range upper bound.
 * @property {number|null} panic_min        - Critical low value (triggers alert).
 * @property {number|null} panic_max        - Critical high value (triggers alert).
 */

/**
 * A single field within the structure_config array.
 *
 * @typedef {Object} StructureField
 * @property {string} key                           - Internal identifier (unique within the config, used in formulas).
 * @property {string} label                         - Human-readable display name.
 * @property {'numeric'|'text'|'options'|'calculated'|'header'} type - Field type.
 * @property {string} [unit]                        - Unit of measurement (e.g., "mg/dL", "g/L").
 * @property {string} [loinc]                       - LOINC code for this specific component/analyte.
 * @property {ReferenceRange[]} [reference_ranges]  - Array of reference ranges (gender/age-specific).
 * @property {string} [formula]                     - Arithmetic formula referencing other field keys.
 *                                                    Only applicable when type is 'calculated'.
 *                                                    Example: "cholesterol - hdl - (triglycerides / 5)"
 * @property {string[]} [options]                   - Predefined choices for 'options' type fields.
 *                                                    Example: ["Positive", "Negative"]
 */

/**
 * The full structure_config stored in the test.structure_config JSON column.
 * It is an ordered array of StructureField objects.
 *
 * @typedef {StructureField[]} StructureConfig
 */

module.exports = {};
