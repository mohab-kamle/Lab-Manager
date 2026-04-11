import React, { useState, useEffect } from 'react';
import './DynamicResultForm.css';

// ─── Safe Expression Tokenizer & Evaluator ─────────────────────────
const TokenType = {
    NUMBER: "NUMBER",
    OPERATOR: "OPERATOR",
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    VARIABLE: "VARIABLE",
};

function tokenize(formula) {
    const tokens = [];
    let i = 0;
    const len = formula.length;

    while (i < len) {
        const ch = formula[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let numStr = "";
            while (i < len && /[0-9.]/.test(formula[i])) {
                numStr += formula[i++];
            }
            const num = parseFloat(numStr);
            if (isNaN(num)) throw new Error(`Invalid number: "${numStr}"`);
            tokens.push({ type: TokenType.NUMBER, value: num });
            continue;
        }
        if ("+-*/".includes(ch)) {
            tokens.push({ type: TokenType.OPERATOR, value: ch });
            i++;
            continue;
        }
        if (ch === "(") {
            tokens.push({ type: TokenType.LPAREN, value: "(" });
            i++;
            continue;
        }
        if (ch === ")") {
            tokens.push({ type: TokenType.RPAREN, value: ")" });
            i++;
            continue;
        }
        if (/[a-zA-Z_]/.test(ch)) {
            let varName = "";
            while (i < len && /[a-zA-Z0-9_]/.test(formula[i])) {
                varName += formula[i++];
            }
            tokens.push({ type: TokenType.VARIABLE, value: varName });
            continue;
        }
        throw new Error(`Unexpected character "${ch}"`);
    }
    return tokens;
}

class ExpressionParser {
    constructor(tokens, variables) {
        this.tokens = tokens;
        this.variables = variables;
        this.pos = 0;
    }
    peek() { return this.pos < this.tokens.length ? this.tokens[this.pos] : null; }
    consume() { return this.tokens[this.pos++]; }
    parse() {
        const result = this.expr();
        if (this.pos < this.tokens.length) throw new Error("Unexpected token");
        return result;
    }
    expr() {
        let left = this.term();
        while (this.peek() && this.peek().type === TokenType.OPERATOR) {
            const op = this.peek().value;
            if (op !== "+" && op !== "-") break;
            this.consume();
            const right = this.term();
            left = op === "+" ? left + right : left - right;
        }
        return left;
    }
    term() {
        let left = this.factor();
        while (this.peek() && this.peek().type === TokenType.OPERATOR) {
            const op = this.peek().value;
            if (op !== "*" && op !== "/") break;
            this.consume();
            const right = this.factor();
            if (op === "/") {
                if (right === 0) throw new Error("Division by zero");
                left = left / right;
            } else {
                left = left * right;
            }
        }
        return left;
    }
    factor() {
        const token = this.peek();
        if (!token) throw new Error("Unexpected end");
        if (token.type === TokenType.OPERATOR && token.value === "-") {
            this.consume();
            return -this.factor();
        }
        if (token.type === TokenType.NUMBER) {
            this.consume();
            return token.value;
        }
        if (token.type === TokenType.VARIABLE) {
            this.consume();
            const key = token.value;
            if (!(key in this.variables)) throw new Error(`Unknown var "${key}"`);
            const val = this.variables[key];
            if (typeof val !== "number" || isNaN(val)) throw new Error("NaN value");
            return val;
        }
        if (token.type === TokenType.LPAREN) {
            this.consume();
            const result = this.expr();
            this.consume();
            return result;
        }
        throw new Error("Unexpected token");
    }
}

function safeEvaluate(formula, variables) {
    const tokens = tokenize(formula);
    const parser = new ExpressionParser(tokens, variables);
    return parser.parse();
}

// ─── Component ───────────────────────────────────────────────────

export default function DynamicResultForm({ structureConfig, patientInfo, value = {}, onChange, antibioticsList = [] }) {
    const [computedResults, setComputedResults] = useState({});

    // Use a stable ref for onChange to avoid it being a useEffect dependency,
    // which would cause an infinite loop since parent renders create new function refs.
    const onChangeRef = React.useRef(onChange);
    React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // Filter structure_config entries to only those matching the patient's gender and age.
    // Entries with distinct keys represent the same analyte for different demographics.
    // If patient info is unknown, all entries are shown.
    const filteredConfig = React.useMemo(() => {
        if (!Array.isArray(structureConfig)) return [];
        const gender = patientInfo?.gender;
        const age = patientInfo?.age;

        // If no patient demographics available, show everything
        if (!gender && (age == null || age === '')) return structureConfig;

        return structureConfig.filter(field => {
            // Fields without reference_ranges (headers, calculated) are always included
            if (!Array.isArray(field.reference_ranges) || field.reference_ranges.length === 0) return true;

            return field.reference_ranges.some(r => {
                const genderMatch = !r.gender || !gender || r.gender.toLowerCase() === gender.toLowerCase();
                const ageMatch =
                    (r.age_min == null || age == null || age >= r.age_min) &&
                    (r.age_max == null || age == null || age <= r.age_max);
                return genderMatch && ageMatch;
            });
        });
    }, [structureConfig, patientInfo?.gender, patientInfo?.age]);

    // Auto-calculate computed fields whenever value changes.
    // Uses onChangeRef so onChange is NOT a dep here (avoids infinite loop).
    useEffect(() => {
        if (!filteredConfig || filteredConfig.length === 0) return;

        const numericValues = {};
        for (const [k, v] of Object.entries(value)) {
            const num = Number(v);
            if (!isNaN(num) && v !== '') numericValues[k] = num;
        }

        const newComputed = {};
        let hasChanges = false;
        
        const calculatedFields = filteredConfig.filter(f => f.type === 'calculated');
        calculatedFields.forEach(field => {
            try {
                if (!field.formula) throw new Error("No formula");
                const val = safeEvaluate(field.formula, numericValues);
                const rounded = Math.round(val * 100) / 100;
                newComputed[field.key] = rounded;
                numericValues[field.key] = rounded;
                
                if (value[field.key] !== rounded) hasChanges = true;
            } catch (err) {
                newComputed[field.key] = '--';
                if (value[field.key] !== '--') hasChanges = true;
            }
        });

        setComputedResults(newComputed);
        
        if (hasChanges && onChangeRef.current) {
            onChangeRef.current({ ...value, ...newComputed });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, filteredConfig]); // intentionally exclude onChangeRef — it's a ref

    const handleInputChange = (key, val) => {
        if (onChangeRef.current) {
            onChangeRef.current({ ...value, ...computedResults, [key]: val });
        }
    };

    const getMatchingRange = (field) => {
        if (!field.reference_ranges || field.reference_ranges.length === 0) return null;
        const gender = patientInfo?.gender;
        const age = patientInfo?.age;

        // Priority 1: exact gender + age match
        if (gender && age != null) {
            const match = field.reference_ranges.find(r =>
                (!r.gender || r.gender === gender) &&
                (r.age_min == null || age >= r.age_min) &&
                (r.age_max == null || age <= r.age_max)
            );
            if (match) return match;
        }

        // Priority 2: gender match only
        if (gender) {
            const match = field.reference_ranges.find(r => r.gender === gender);
            if (match) return match;
        }

        // Priority 3: no gender restriction (universal)
        const match = field.reference_ranges.find(r => !r.gender);
        if (match) return match;

        // Fallback: first range
        return field.reference_ranges[0];
    };


    const getFlag = (val, range) => {
        if (!val || val === '--') return null;
        const num = Number(val);
        if (isNaN(num) || !range) return null;

        if (range.panic_max !== null && num > range.panic_max) return 'PANIC';
        if (range.panic_min !== null && num < range.panic_min) return 'PANIC';
        if (range.max !== null && num > range.max) return 'HIGH';
        if (range.min !== null && num < range.min) return 'LOW';
        return 'NORMAL';
    };

    const renderField = (field) => {
        if (field.type === 'header') {
            return (
                <div key={field.key} className="form-header">
                    <h2>{field.label}</h2>
                </div>
            );
        }

        const isCalculated = field.type === 'calculated';
        const rawValue = isCalculated ? (computedResults[field.key] ?? value[field.key] ?? '') : (value[field.key] ?? '');
        const range = getMatchingRange(field);
        const flag = getFlag(rawValue, range);

        let inputClass = "result-input";
        if (flag === 'PANIC') inputClass += " input-panic";
        else if (flag === 'HIGH' || flag === 'LOW') inputClass += " input-warn";
        else if (flag === 'NORMAL') inputClass += " input-normal";

        let inputElement;
        
        if (field.type === 'text') {
            inputElement = (
                <textarea
                    className={`result-textarea ${inputClass}`}
                    value={typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder="Enter text..."
                    rows={4}
                    style={{ width: '100%', padding: '8px', resize: 'vertical' }}
                />
            );
        } else if (field.type === 'culture_panel') {
            const cultureValue = (rawValue && typeof rawValue === 'object') ? rawValue : { organism: '', colony_count: '', antibiotics: {} };
            const configuredAntibiotics = field.antibiotics || []; // expecting string array
            
            inputElement = (
                <div className="culture-panel-input" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            placeholder="Isolated Organism..."
                            value={cultureValue.organism || ''}
                            onChange={(e) => handleInputChange(field.key, {...cultureValue, organism: e.target.value})}
                            className="result-input"
                            style={{ flex: 2 }}
                        />
                        <input
                            type="text"
                            placeholder="Colony Count..."
                            value={cultureValue.colony_count || ''}
                            onChange={(e) => handleInputChange(field.key, {...cultureValue, colony_count: e.target.value})}
                            className="result-input"
                            style={{ flex: 1 }}
                        />
                    </div>
                    
                    {/* Add Antibiotic Control */}
                    {antibioticsList && antibioticsList.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                className="result-input"
                                style={{ flex: 1, padding: '6px' }}
                                onChange={(e) => {
                                    const abName = e.target.value;
                                    if (abName && !cultureValue.antibiotics?.[abName]) {
                                        handleInputChange(field.key, {
                                            ...cultureValue,
                                            antibiotics: { 
                                                ...(cultureValue.antibiotics || {}), 
                                                [abName]: { sensitivity: '-', mic: '' } 
                                            }
                                        });
                                    }
                                    e.target.value = ""; // reset dropdown
                                }}
                            >
                                <option value="">+ Add Antibiotic...</option>
                                {antibioticsList
                                    .filter(ab => !cultureValue.antibiotics || !cultureValue.antibiotics[ab.name])
                                    .map(ab => (
                                        <option key={ab.id} value={ab.name}>{ab.name}</option>
                                    ))}
                            </select>
                        </div>
                    )}
                    
                    {Object.keys(cultureValue.antibiotics || {}).length > 0 && (
                        <div className="antibiotics-list" style={{ marginTop: '10px', background: '#f9fafb', padding: '10px', borderRadius: '4px' }}>
                            <h6 style={{ marginBottom: '8px', color: '#4b5563' }}>Antibiotics Susceptibility:</h6>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.keys(cultureValue.antibiotics || {}).map(ab => {
                                    const abData = cultureValue.antibiotics[ab] || { sensitivity: '-', mic: '' };
                                    return (
                                        <div key={ab} className="antibiotic-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ flex: 2, fontSize: '0.85rem' }}>{ab}</span>
                                            
                                            {/* Sensitivity Dropdown */}
                                            <select 
                                                value={abData.sensitivity || '-'} 
                                                onChange={(e) => handleInputChange(field.key, {
                                                    ...cultureValue, 
                                                    antibiotics: { 
                                                        ...cultureValue.antibiotics, 
                                                        [ab]: { ...abData, sensitivity: e.target.value } 
                                                    }
                                                })}
                                                style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                            >
                                                <option value="-">-</option>
                                                <option value="S">Sensitive (S)</option>
                                                <option value="R">Resistant (R)</option>
                                                <option value="I">Intermediate (I)</option>
                                            </select>

                                            {/* MIC Input */}
                                            <input 
                                                type="text"
                                                placeholder="MIC"
                                                value={abData.mic || ''}
                                                onChange={(e) => handleInputChange(field.key, {
                                                    ...cultureValue,
                                                    antibiotics: {
                                                        ...cultureValue.antibiotics,
                                                        [ab]: { ...abData, mic: e.target.value }
                                                    }
                                                })}
                                                style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                style={{ padding: '0 6px' }}
                                                onClick={() => {
                                                    const newAbs = { ...cultureValue.antibiotics };
                                                    delete newAbs[ab];
                                                    handleInputChange(field.key, { ...cultureValue, antibiotics: newAbs });
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            );
        } else {
            inputElement = (
                <input
                    type={field.type === 'numeric' ? 'number' : 'text'}
                    className={inputClass}
                    value={typeof rawValue === 'object' ? rawValue.value || '' : rawValue}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    readOnly={isCalculated}
                    placeholder={isCalculated ? 'Auto-calculated' : 'Enter value...'}
                />
            );
        }

        return (
            <div key={field.key} className="form-row">
                <div className="field-label-wrapper">
                    <label className="field-label">{field.label}</label>
                    {field.loinc && <span className="loinc-badge">LOINC: {field.loinc}</span>}
                </div>
                
                <div className="field-input-wrapper">
                    <div className="input-group">
                        {inputElement}
                        {field.unit && <span className="unit-label">{field.unit}</span>}
                    </div>

                    {flag && flag !== 'NORMAL' && (
                        <span className={`flag-badge badge-${flag.toLowerCase()}`}>{flag}</span>
                    )}

                    {range && (
                        <div className="range-hint">
                            Reference: {range.min !== null ? range.min : '-'} - {range.max !== null ? range.max : '-'} {field.unit}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="dynamic-result-form">
            <div className="patient-banner">
                <span className="banner-item"><strong>Gender:</strong> {patientInfo?.gender}</span>
                <span className="banner-item"><strong>Age:</strong> {patientInfo?.age} {patientInfo?.age_unit}</span>
            </div>
            
            <div className="fields-container">
                {filteredConfig.map(renderField)}
            </div>
        </div>
    );
}
