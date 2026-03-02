const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../models');
const { Op } = require('sequelize');

async function checkTableAndColumns() {
    console.log('--- Check 1: Table & Column Existence ---');
    try {
        // global_test_catalog
        if (db.global_test_catalog) {
            await db.global_test_catalog.findOne();
            console.log('✅ global_test_catalog table exists and is accessible.');
        } else {
            console.log('❌ global_test_catalog model not found in Sequelize.');
        }

        // test table columns
        if (db.test) {
            const testAttributes = Object.keys(db.test.getAttributes());
            const missingTestCols = ['structure_config', 'type'].filter(col => !testAttributes.includes(col));
            if (missingTestCols.length === 0) {
                console.log('✅ test table has required columns: structure_config, type.');
            } else {
                console.log(`❌ test table is missing columns: ${missingTestCols.join(', ')}`);
            }
        } else {
            console.log('❌ test model not found in Sequelize.');
        }

        // medical_report_results table columns
        if (db.medical_report_results) {
            const resultAttributes = Object.keys(db.medical_report_results.getAttributes());
            const missingResultCols = ['test_id', 'result_value', 'clinical_flag', 'parameter_key'].filter(col => !resultAttributes.includes(col));
            if (missingResultCols.length === 0) {
                console.log('✅ medical_report_results table has required columns: test_id, result_value, clinical_flag, parameter_key.');
            } else {
                console.log(`❌ medical_report_results table is missing columns: ${missingResultCols.join(', ')}`);
            }
        } else {
            console.log('❌ medical_report_results model not found in Sequelize.');
        }
    } catch (error) {
        console.log('❌ Error during Check 1:', error.message);
    }
    console.log();
}

async function checkJsonIntegrity() {
    console.log('--- Check 2: JSON Integrity ---');
    try {
        if (db.test) {
            const emptyStructureConfigCount = await db.test.count({
                where: {
                    [Op.or]: [
                        { structure_config: null },
                        { structure_config: '' },
                        { structure_config: '{}' },
                        { structure_config: '[]' }
                    ]
                }
            });
            if (emptyStructureConfigCount > 0) {
                console.log(`❌ Warning: ${emptyStructureConfigCount} rows in test table have empty or NULL structure_config.`);
            } else {
                console.log('✅ No empty structure_configs found in test table.');
            }
        } else {
            console.log('❌ Cannot check JSON integrity for test table (model not found).');
        }

        if (db.medical_report_results) {
            const emptyResultValueCount = await db.medical_report_results.count({
                where: {
                    [Op.or]: [
                        { result_value: null },
                        { result_value: '' }
                    ]
                }
            });
            if (emptyResultValueCount > 0) {
                console.log(`❌ Warning: ${emptyResultValueCount} rows in medical_report_results have empty or NULL result_value.`);
            } else {
                console.log('✅ No empty result_values found in medical_report_results.');
            }
        } else {
            console.log('❌ Cannot check JSON integrity for medical_report_results (model not found).');
        }
    } catch (error) {
        console.log('❌ Error during Check 2:', error.message);
    }
    console.log();
}

async function checkOrphanedData() {
    console.log('--- Check 3: Orphaned Data (Foreign Key Integrity) ---');
    try {
        if (db.medical_report_results && db.test) {
            const [orphanedResults] = await db.sequelize.query(`
        SELECT COUNT(*) as count
        FROM medical_report_results
        WHERE test_id NOT IN (SELECT id FROM test)
      `);
            const orphanedResultCount = parseInt(orphanedResults[0].count, 10);
            if (orphanedResultCount > 0) {
                console.log(`❌ Critical: ${orphanedResultCount} rows in medical_report_results point to a non-existent test_id.`);
            } else {
                console.log('✅ Foreign key integrity OK for medical_report_results -> test.');
            }
        }

        if (db.medical_report_has_test && db.test) {
            const [orphanedHasTest] = await db.sequelize.query(`
        SELECT COUNT(*) as count
        FROM medical_report_has_test
        WHERE test_id NOT IN (SELECT id FROM test)
      `);
            const orphanedHasTestCount = parseInt(orphanedHasTest[0].count, 10);
            if (orphanedHasTestCount > 0) {
                console.log(`❌ Critical: ${orphanedHasTestCount} rows in medical_report_has_test point to a non-existent test_id.`);
            } else {
                console.log('✅ Foreign key integrity OK for medical_report_has_test -> test.');
            }
        }

        if (db.bill_has_test && db.test) {
            const [orphanedBill] = await db.sequelize.query(`
        SELECT COUNT(*) as count
        FROM bill_has_test
        WHERE test_id NOT IN (SELECT id FROM test)
      `);
            const orphanedBillCount = parseInt(orphanedBill[0].count, 10);
            if (orphanedBillCount > 0) {
                console.log(`❌ Critical: ${orphanedBillCount} rows in bill_has_test point to a non-existent test_id.`);
            } else {
                console.log('✅ Foreign key integrity OK for bill_has_test -> test.');
            }
        }
    } catch (error) {
        console.log('❌ Error during Check 3:', error.message);
    }
    console.log();
}

async function checkCultureMerge() {
    console.log('--- Check 4: The Culture Merge Verification ---');
    try {
        if (db.test) {
            const cultureCount = await db.test.count({
                where: {
                    type: 'culture'
                }
            });
            if (cultureCount === 0) {
                console.log(`❌ Critical: 0 rows found in test table with type 'culture'. The culture migration may have failed.`);
            } else {
                console.log(`✅ ${cultureCount} culture tests found in the test table! Culture merge was successful.`);
            }
        } else {
            console.log('❌ Cannot check culture merge verify because test model was not found.');
        }
    } catch (error) {
        console.log('❌ Error during Check 4:', error.message);
    }
}

async function runSanityCheck() {
    console.log('🔍 Starting Database Sanity Check...\n');

    try {
        await db.sequelize.authenticate();
        console.log('✅ Database connection established.\n');
    } catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        process.exit(1);
    }

    await checkTableAndColumns();
    await checkJsonIntegrity();
    await checkOrphanedData();
    await checkCultureMerge();

    console.log('\n🏁 Sanity check complete.');
    process.exit(0);
}

// Execute the sanity check
runSanityCheck();
