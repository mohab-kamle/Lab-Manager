const { Sequelize } = require('sequelize');
const db = require('../models'); // Assumes this script runs from the server folder

async function runMigration() {
    const transaction = await db.sequelize.transaction();

    try {
        console.log("==================================================");
        console.log("🚀 Starting Migration: Cultures -> Tests");
        console.log("==================================================");

        console.log("\n🛠️  Ensuring database schema supports 'culture' type...");
        await db.sequelize.query("ALTER TABLE test MODIFY COLUMN type ENUM('single', 'panel', 'culture') NOT NULL DEFAULT 'single';", { transaction });
        console.log("✅ Schema updated successfully.");

        // 1. Fetch legacy cultures
        const [cultures] = await db.sequelize.query('SELECT * FROM culture;', { transaction });
        console.log(`\nFound ${cultures.length} legacy cultures to migrate.`);

        const cultureIdMapping = {}; // old_culture_id -> new_test_id

        for (const culture of cultures) {
            // Create new Test for each Culture
            const newTest = await db.test.create({
                name: culture.name,
                price: culture.price || null,
                type: 'culture',
                category_id: culture.category_id,
                sample_type_id: culture.sample_type_id || null,
                lab_id: culture.lab_id || null,
                structure_config: [
                    {
                        key: `comp_${Date.now()}_culture`,
                        type: "culture_panel",
                        label: "Culture Panel"
                    }
                ]
            }, { transaction });

            cultureIdMapping[culture.id] = newTest.id;
            console.log(` ✅ Migrated Culture "${culture.name}" (ID: ${culture.id}) -> Test (ID: ${newTest.id})`);
        }

        console.log(`\nSuccessfully migrated ${Object.keys(cultureIdMapping).length} Culture definitions.`);

        // 2. Rewire Financial & Package Associations
        console.log("\n==================================================");
        console.log("🔗 Rewiring Financial & Package Associations...");

        // bill_has_culture -> bill_has_test
        let billedRewired = 0;
        try {
            const [billCultures] = await db.sequelize.query('SELECT * FROM bill_has_culture;', { transaction });
            for (const bc of billCultures) {
                if (cultureIdMapping[bc.culture_id]) {
                    await db.bill_has_test.create({
                        bill_id: bc.bill_id,
                        test_id: cultureIdMapping[bc.culture_id],
                        price: bc.price,
                        lab_id: bc.lab_id
                    }, { transaction });
                    billedRewired++;
                }
            }
            console.log(` ✅ Rewired ${billedRewired} bill_has_culture records.`);
        } catch (e) {
            console.warn(` ⚠️ Could not rewire bill_has_culture (Table might not exist)`);
        }

        // pao_has_culture -> pao_has_test
        let paoRewired = 0;
        try {
            const [paoCultures] = await db.sequelize.query('SELECT * FROM pao_has_culture;', { transaction });
            for (const pc of paoCultures) {
                if (cultureIdMapping[pc.culture_id]) {
                    await db.pao_has_test.create({
                        pao_id: pc.pao_id,
                        test_id: cultureIdMapping[pc.culture_id]
                    }, { transaction });
                    paoRewired++;
                }
            }
            console.log(` ✅ Rewired ${paoRewired} pao_has_culture records.`);
        } catch (e) {
            console.warn(` ⚠️ Could not rewire pao_has_culture (Table might not exist)`);
        }

        // contract_has_culture -> contract_has_test
        let contractRewired = 0;
        try {
            const [contractCultures] = await db.sequelize.query('SELECT * FROM contract_has_culture;', { transaction });
            for (const cc of contractCultures) {
                if (cultureIdMapping[cc.culture_id]) {
                    await db.contract_has_test.create({
                        contract_id: cc.contract_id,
                        test_id: cultureIdMapping[cc.culture_id],
                        price: cc.price
                    }, { transaction });
                    contractRewired++;
                }
            }
            console.log(` ✅ Rewired ${contractRewired} contract_has_culture records.`);
        } catch (e) {
            console.warn(` ⚠️ Could not rewire contract_has_culture (Table might not exist)`);
        }

        // 3. Rewire Medical Orders
        console.log("\n==================================================");
        console.log("🩺 Rewiring Medical Orders...");
        let reportRewired = 0;
        try {
            const [reportCultures] = await db.sequelize.query('SELECT * FROM medical_report_has_culture;', { transaction });
            for (const rc of reportCultures) {
                if (cultureIdMapping[rc.culture_id]) {
                    await db.medical_report_has_test.create({
                        medical_report_id: rc.medical_report_id,
                        test_id: cultureIdMapping[rc.culture_id],
                        status: rc.status,
                        result: rc.result,
                        lab_id: rc.lab_id
                    }, { transaction });
                    reportRewired++;
                }
            }
            console.log(` ✅ Rewired ${reportRewired} medical_report_has_culture records.`);
        } catch (e) {
            console.warn(` ⚠️ Could not rewire medical_report_has_culture (Table might not exist)`);
        }

        // Commit Transaction
        await transaction.commit();
        console.log("\n==================================================");
        console.log("🎉 Migration completed successfully!");
        console.log("==================================================");

    } catch (error) {
        // Rollback on any failure
        await transaction.rollback();
        console.error("\n❌ Migration failed! Transaction rolled back.");
        console.error(error);
    } finally {
        await db.sequelize.close(); // Close DB connection
    }
}

// Execute migration
runMigration().catch((error) => {
    console.error("Unhandled top-level error:", error);
    process.exit(1);
});
