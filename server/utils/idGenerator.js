const otpGenerator = require('otp-generator');

/**
 * Generates a unique 9-character sample ID.
 * Format: SMP + 6 uppercase alphanumeric characters.
 * Example: SMPA1B2C3
 * 
 * @param {Object} model - The Sequelize model to check for uniqueness (lab_samples).
 * @returns {Promise<string>} - A unique 9-character sample ID.
 */
const generateSampleId = async (model) => {
    let sampleId;
    let exists = true;

    while (exists) {
        // Generate 6 random uppercase alphanumeric characters
        const code = otpGenerator.generate(6, {
            upperCaseAlphabets: true,
            specialChars: false,
            lowerCaseAlphabets: false,
            digits: true
        });

        sampleId = `SMP${code}`;

        // Check for uniqueness in the database
        const existing = await model.findOne({
            where: { sample_id: sampleId },
            attributes: ['id'] // Optimized: only fetch ID
        });

        exists = !!existing;
    }

    return sampleId;
};

module.exports = {
    generateSampleId
};
