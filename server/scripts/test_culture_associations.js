const db = require('../models');

async function testCultureAssociations() {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected successfully');

        // Get all medical reports with their culture associations
        const reports = await db.medical_report.findAll({
            include: [
                {
                    model: db.culture,
                    as: 'culture_id_culture_medical_report_has_cultures',
                    through: { attributes: ['id', 'result', 'status'] },
                    attributes: ['id', 'name']
                },
                {
                    model: db.medical_report_has_culture,
                    as: 'medical_report_has_cultures',
                    attributes: ['id', 'culture_id', 'result', 'status']
                }
            ],
            limit: 5
        });

        console.log(`Found ${reports.length} medical reports`);
        
        reports.forEach((report, index) => {
            console.log(`\n--- Medical Report ${index + 1} (ID: ${report.id}) ---`);
            console.log('Associated Cultures:', report.culture_id_culture_medical_report_has_cultures?.length || 0);
            console.log('Culture Associations:', report.medical_report_has_cultures?.length || 0);
            
            if (report.culture_id_culture_medical_report_has_cultures?.length > 0) {
                console.log('Culture IDs:', report.culture_id_culture_medical_report_has_cultures.map(c => c.id));
            }
            
            if (report.medical_report_has_cultures?.length > 0) {
                console.log('Association Culture IDs:', report.medical_report_has_cultures.map(c => c.culture_id));
            }
        });

        // Check if there are any medical reports with cultures but no associations
        const reportsWithCulturesButNoAssociations = reports.filter(report => 
            (report.culture_id_culture_medical_report_has_cultures?.length || 0) > 0 && 
            (report.medical_report_has_cultures?.length || 0) === 0
        );

        if (reportsWithCulturesButNoAssociations.length > 0) {
            console.log('\n⚠️  WARNING: Found medical reports with cultures but no associations:');
            reportsWithCulturesButNoAssociations.forEach(report => {
                console.log(`Medical Report ID: ${report.id}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testCultureAssociations(); 