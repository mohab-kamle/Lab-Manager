const db = require('./models');

async function fixNaNPrices() {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected successfully');

        // Fix NaN prices in bill_has_test
        const testResult = await db.sequelize.query(`
            UPDATE bill_has_test 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${testResult[0].affectedRows} NaN prices in bill_has_test`);

        // Fix NaN prices in bill_has_culture
        const cultureResult = await db.sequelize.query(`
            UPDATE bill_has_culture 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${cultureResult[0].affectedRows} NaN prices in bill_has_culture`);

        // Fix NaN prices in bill_has_package
        const packageResult = await db.sequelize.query(`
            UPDATE bill_has_package 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${packageResult[0].affectedRows} NaN prices in bill_has_package`);

        // Fix NaN prices in bill_has_tg
        const tgResult = await db.sequelize.query(`
            UPDATE bill_has_tg 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${tgResult[0].affectedRows} NaN prices in bill_has_tg`);

        // Fix NaN prices in test table
        const testTableResult = await db.sequelize.query(`
            UPDATE test 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${testTableResult[0].affectedRows} NaN prices in test table`);

        // Fix NaN prices in culture table
        const cultureTableResult = await db.sequelize.query(`
            UPDATE culture 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${cultureTableResult[0].affectedRows} NaN prices in culture table`);

        // Fix NaN prices in test_group table
        const testGroupResult = await db.sequelize.query(`
            UPDATE test_group 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${testGroupResult[0].affectedRows} NaN prices in test_group table`);

        // Fix NaN prices in packages_and_offers table
        const packagesResult = await db.sequelize.query(`
            UPDATE packages_and_offers 
            SET price = 0.00 
            WHERE price IS NULL OR price = 'NaN' OR price = ''
        `);
        console.log(`Fixed ${packagesResult[0].affectedRows} NaN prices in packages_and_offers table`);

        console.log('All NaN prices have been fixed!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing NaN prices:', error);
        process.exit(1);
    }
}

fixNaNPrices(); 