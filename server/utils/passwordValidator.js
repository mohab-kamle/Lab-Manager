/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters long
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (any non-alphanumeric character)
 *
 * @param {string} password - The password to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { isValid: false, error: "Password is required" };
    }

    if (password.length < 8) {
        return { isValid: false, error: "Password must be at least 8 characters long" };
    }

    if (!/[A-Z]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one uppercase letter" };
    }

    if (!/[a-z]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one lowercase letter" };
    }

    if (!/[0-9]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one number" };
    }

    // Check for any character that is NOT a letter (A-Z, a-z) or a number (0-9)
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one special character" };
    }

    return { isValid: true, error: null };
};

module.exports = { validatePassword };
