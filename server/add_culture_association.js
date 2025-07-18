const { Sequelize } = require('sequelize');
const config = require('./config/config.json');

// Create Sequelize instance
const sequelize = new Sequelize(config.development);

async function addCultureAssociation() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Add culture ID 14 to medical report ID 20 (no createdAt/updatedAt)
        const result = await sequelize.query(`
            INSERT INTO medical_report_has_culture (medical_report_id, culture_id, status)
            VALUES (20, 14, 'pending')
            ON DUPLICATE KEY UPDATE status = 'pending'
        `);

        console.log('Culture association added successfully:', result);

        // Verify the association was added
        const associations = await sequelize.query(`
            SELECT * FROM medical_report_has_culture 
            WHERE medical_report_id = 20
        `);

        console.log('Current cultures for medical report 20:', associations[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

addCultureAssociation(); 