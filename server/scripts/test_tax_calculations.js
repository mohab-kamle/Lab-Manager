/**
 * Test script for Tax Calculation Logic
 * This script verifies the logic used in server/routes/invoices.js
 */

function calculateTax(subtotal, tax_rate, tax) {
    let finalTax = parseFloat(tax || 0);
    let finalTaxRate = parseFloat(tax_rate || 0);
    const finalSubtotal = parseFloat(subtotal || 0);

    if (finalTaxRate > 0 && finalTax === 0) {
        finalTax = finalSubtotal * finalTaxRate;
    } else if (finalTax > 0 && finalTaxRate === 0 && finalSubtotal > 0) {
        finalTaxRate = finalTax / finalSubtotal;
    }
    
    return {
        tax: Math.round(finalTax * 100) / 100,
        tax_rate: Math.round(finalTaxRate * 10000) / 10000
    };
}

const testCases = [
    { 
        name: "Calculate tax from rate",
        subtotal: 100, tax_rate: 0.05, tax: 0, 
        expected: { tax: 5, tax_rate: 0.05 } 
    },
    { 
        name: "Calculate rate from tax",
        subtotal: 100, tax_rate: 0, tax: 5, 
        expected: { tax: 5, tax_rate: 0.05 } 
    },
    { 
        name: "Complex decimal rate",
        subtotal: 200, tax_rate: 0.0825, tax: 0, 
        expected: { tax: 16.5, tax_rate: 0.0825 } 
    },
    { 
        name: "Rounding amount half-up",
        subtotal: 333.33, tax_rate: 0.1, tax: 0, 
        expected: { tax: 33.33, tax_rate: 0.1 } 
    },
    { 
        name: "Zero values",
        subtotal: 100, tax_rate: 0, tax: 0, 
        expected: { tax: 0, tax_rate: 0 } 
    },
    { 
        name: "Zero subtotal with rate",
        subtotal: 0, tax_rate: 0.1, tax: 0, 
        expected: { tax: 0, tax_rate: 0.1 } 
    },
    { 
        name: "Rounding rate to 4 decimal places",
        subtotal: 300, tax_rate: 0, tax: 10, 
        expected: { tax: 10, tax_rate: 0.0333 } 
    }
];

let passed = 0;
testCases.forEach((t, i) => {
    const result = calculateTax(t.subtotal, t.tax_rate, t.tax);
    const isTaxPass = Math.abs(result.tax - t.expected.tax) < 0.001;
    const isRatePass = Math.abs(result.tax_rate - t.expected.tax_rate) < 0.001;
    
    if (isTaxPass && isRatePass) {
        console.log(`✅ Test ${i + 1} (${t.name}): PASS`);
        passed++;
    } else {
        console.log(`❌ Test ${i + 1} (${t.name}): FAIL`);
        console.log(`   Input: subtotal=${t.subtotal}, rate=${t.tax_rate}, tax=${t.tax}`);
        console.log(`   Expected: tax=${t.expected.tax}, rate=${t.expected.tax_rate}`);
        console.log(`   Actual:   tax=${result.tax}, rate=${result.tax_rate}`);
    }
});

console.log(`\nSummary: ${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
    process.exit(0);
} else {
    process.exit(1);
}
