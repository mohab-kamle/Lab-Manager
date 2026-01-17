const { validatePassword } = require('../utils/passwordValidator');

const testCases = [
    { password: 'short', expected: false, reason: 'Too short' },
    { password: 'nouppercase1!', expected: false, reason: 'No uppercase' },
    { password: 'NOLOWERCASE1!', expected: false, reason: 'No lowercase' },
    { password: 'NoNumber!', expected: false, reason: 'No number' },
    { password: 'NoSpecialChar1', expected: false, reason: 'No special char' },
    { password: 'ValidPassword1!', expected: true, reason: 'Valid' },
    { password: '', expected: false, reason: 'Empty' },
    { password: null, expected: false, reason: 'Null' },
    { password: 12345, expected: false, reason: 'Number type' },
];

let allPassed = true;

console.log('Testing passwordValidator...');

testCases.forEach((test, index) => {
    const result = validatePassword(test.password);
    if (result.isValid !== test.expected) {
        console.error(`❌ Test Case ${index + 1} Failed: ${test.reason}`);
        console.error(`   Input: "${test.password}"`);
        console.error(`   Expected: ${test.expected}, Got: ${result.isValid}`);
        console.error(`   Message: ${result.message}`);
        allPassed = false;
    } else {
        console.log(`✅ Test Case ${index + 1} Passed: ${test.reason}`);
    }
});

if (allPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.error('\n❌ Some tests failed.');
    process.exit(1);
}
