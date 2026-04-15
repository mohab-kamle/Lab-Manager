/**
 * Calculation Engine — Safe formula evaluation for test results
 *
 * Evaluates "calculated" fields in a test's structure_config using
 * a safe tokenizer/parser (no eval or new Function).
 *
 * @module services/calculationEngine
 */

// ─── Safe Expression Tokenizer & Evaluator ─────────────────────────

/** @enum {string} */
const TokenType = {
    NUMBER: "NUMBER",
    OPERATOR: "OPERATOR",
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    VARIABLE: "VARIABLE",
};

/**
 * Tokenize a formula string into an array of tokens.
 * Supports: numbers (int/float), operators (+, -, *, /), parentheses,
 * and variable names (field keys like "cholesterol", "hdl").
 *
 * @param {string} formula
 * @returns {{ type: string, value: string|number }[]}
 */
function tokenize(formula) {
    const tokens = [];
    let i = 0;
    const len = formula.length;

    while (i < len) {
        const ch = formula[i];

        // Skip whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // Numbers (integers and decimals)
        if (/[0-9.]/.test(ch)) {
            let numStr = "";
            while (i < len && /[0-9.]/.test(formula[i])) {
                numStr += formula[i++];
            }
            const num = parseFloat(numStr);
            if (isNaN(num)) {
                throw new Error(`Invalid number literal: "${numStr}"`);
            }
            tokens.push({ type: TokenType.NUMBER, value: num });
            continue;
        }

        // Operators
        if ("+-*/".includes(ch)) {
            tokens.push({ type: TokenType.OPERATOR, value: ch });
            i++;
            continue;
        }

        // Parentheses
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

        // Variable names (field keys: letters, digits, underscores)
        if (/[a-zA-Z_]/.test(ch)) {
            let varName = "";
            while (i < len && /[a-zA-Z0-9_]/.test(formula[i])) {
                varName += formula[i++];
            }
            tokens.push({ type: TokenType.VARIABLE, value: varName });
            continue;
        }

        throw new Error(`Unexpected character "${ch}" in formula at position ${i}`);
    }

    return tokens;
}

/**
 * Recursive descent parser for arithmetic expressions.
 * Supports: +, -, *, /, parentheses, variables, numbers.
 *
 * Grammar:
 *   expr     → term (('+' | '-') term)*
 *   term     → factor (('*' | '/') factor)*
 *   factor   → NUMBER | VARIABLE | '(' expr ')' | ('-' factor)
 */
class ExpressionParser {
    /**
     * @param {{ type: string, value: string|number }[]} tokens
     * @param {Record<string, number>} variables - map of field key → numeric value
     */
    constructor(tokens, variables) {
        this.tokens = tokens;
        this.variables = variables;
        this.pos = 0;
    }

    peek() {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
    }

    consume() {
        return this.tokens[this.pos++];
    }

    /**
     * Parse and evaluate the full expression.
     * @returns {number}
     */
    parse() {
        const result = this.expr();
        if (this.pos < this.tokens.length) {
            throw new Error(
                `Unexpected token "${this.tokens[this.pos].value}" at position ${this.pos}`
            );
        }
        return result;
    }

    /** expr → term (('+' | '-') term)* */
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

    /** term → factor (('*' | '/') factor)* */
    term() {
        let left = this.factor();
        while (this.peek() && this.peek().type === TokenType.OPERATOR) {
            const op = this.peek().value;
            if (op !== "*" && op !== "/") break;
            this.consume();
            const right = this.factor();
            if (op === "/") {
                if (right === 0) {
                    throw new Error("Division by zero");
                }
                left = left / right;
            } else {
                left = left * right;
            }
        }
        return left;
    }

    /** factor → NUMBER | VARIABLE | '(' expr ')' | ('-' factor) */
    factor() {
        const token = this.peek();

        if (!token) {
            throw new Error("Unexpected end of expression");
        }

        // Unary minus
        if (token.type === TokenType.OPERATOR && token.value === "-") {
            this.consume();
            return -this.factor();
        }

        // Number literal
        if (token.type === TokenType.NUMBER) {
            this.consume();
            return token.value;
        }

        // Variable (field key)
        if (token.type === TokenType.VARIABLE) {
            this.consume();
            const key = token.value;
            if (!(key in this.variables)) {
                throw new Error(`Unknown variable "${key}" in formula`);
            }
            const val = this.variables[key];
            if (typeof val !== "number" || isNaN(val)) {
                throw new Error(
                    `Variable "${key}" has a non-numeric value: ${val}`
                );
            }
            return val;
        }

        // Parenthesized expression
        if (token.type === TokenType.LPAREN) {
            this.consume(); // eat '('
            const result = this.expr();
            const closing = this.peek();
            if (!closing || closing.type !== TokenType.RPAREN) {
                throw new Error("Missing closing parenthesis");
            }
            this.consume(); // eat ')'
            return result;
        }

        throw new Error(`Unexpected token: "${token.value}"`);
    }
}

/**
 * Safely evaluate an arithmetic formula string.
 *
 * @param {string} formula - e.g. "cholesterol - hdl - (triglycerides / 5)"
 * @param {Record<string, number>} variables - field key → numeric value
 * @returns {number}
 */
function safeEvaluate(formula, variables) {
    const tokens = tokenize(formula);
    const parser = new ExpressionParser(tokens, variables);
    return parser.parse();
}

// ─── Main API ──────────────────────────────────────────────────────

/**
 * Calculate test results, including computed/calculated fields.
 *
 * @param {Record<string, number|string>} inputs - User-entered values keyed by field key.
 * @param {import('../models/types/structureConfig.typedef').StructureConfig} structure - The structure_config array from the test.
 * @returns {{ results: Record<string, number|string|null>, errors: string[] }}
 *
 * @example
 *   const { results, errors } = calculateTestResults(
 *     { cholesterol: 250, hdl: 45, triglycerides: 150 },
 *     lipidPanelStructure
 *   );
 *   // results.ldl === 175  (250 - 45 - 150/5)
 */
function calculateTestResults(inputs, structure) {
    const results = {};
    const errors = [];

    if (!Array.isArray(structure)) {
        return { results, errors: ["structure_config is not an array"] };
    }

    // First pass: copy all non-calculated values from inputs
    for (const field of structure) {
        if (field.type === "header") continue;

        if (field.type !== "calculated") {
            if (field.key in inputs) {
                results[field.key] = inputs[field.key];
            } else {
                results[field.key] = null;
            }
        }
    }

    // Second pass: evaluate calculated fields
    // Build a numeric lookup from the results collected so far
    const numericValues = {};
    for (const [key, val] of Object.entries(results)) {
        if (typeof val === "number" && !isNaN(val)) {
            numericValues[key] = val;
        } else if (typeof val === "string" && !isNaN(Number(val))) {
            numericValues[key] = Number(val);
        }
    }

    for (const field of structure) {
        if (field.type !== "calculated") continue;

        if (!field.formula) {
            errors.push(`Field "${field.key}" is calculated but has no formula.`);
            results[field.key] = null;
            continue;
        }

        try {
            const value = safeEvaluate(field.formula, numericValues);
            results[field.key] = Math.round(value * 100) / 100; // Round to 2 decimal places
            // Also make this available for downstream calculated fields
            numericValues[field.key] = results[field.key];
        } catch (err) {
            errors.push(`Field "${field.key}": ${err.message}`);
            results[field.key] = null;
        }
    }

    return { results, errors };
}

module.exports = {
    calculateTestResults,
    safeEvaluate, // Exported for testing
};
