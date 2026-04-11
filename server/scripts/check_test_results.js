const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '../.env') });
const db = require("../models");
const { Op } = require("sequelize");

async function checkTestResults() {
    try {
        console.log("Loading environment variables...");
        console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
        if (process.env.DATABASE_URL) {
            console.log("DATABASE_URL starts with:", process.env.DATABASE_URL.substring(0, 10));
        }

        console.log("Authenticating database connection...");
        await db.sequelize.authenticate();
        console.log("Database connection established successfully.");

        console.log("Checking usage of 'result' in medical_report_has_test...");

        // Find all entries with a non-null result
        const resultsWithValue = await db.medical_report_has_test.findAll({
            where: {
                result: {
                    [Op.ne]: null
                }
            },
            attributes: ['medical_report_id', 'test_id', 'result']
        });

        console.log(`Found ${resultsWithValue.length} entries in medical_report_has_test with a result value.`);

        let usedInTestsWithoutComponents = 0;
        let testsWithoutComponentsIds = new Set();
        let totalTestsChecked = 0;

        // Cache test component counts to avoid repeating queries
        const testComponentCounts = {};

        for (const record of resultsWithValue) {
            const testId = record.test_id;

            if (testComponentCounts[testId] === undefined) {
                const componentCount = await db.test_component.count({
                    where: { test_id: testId }
                });
                testComponentCounts[testId] = componentCount;
            }

            if (testComponentCounts[testId] === 0) {
                usedInTestsWithoutComponents++;
                testsWithoutComponentsIds.add(testId);
                // console.log(`Active usage found! Report ID: ${record.medical_report_id}, Test ID: ${testId}, Result: ${record.result}`);
            }
            totalTestsChecked++;
        }

        console.log(`\nAnalysis Result:`);
        console.log(`Total entries with result value: ${resultsWithValue.length}`);
        console.log(`Entries where the test has NO components: ${usedInTestsWithoutComponents}`);

        if (usedInTestsWithoutComponents > 0) {
            console.log(`\nWARNING: The 'result' attribute IS used for tests without components.`);
            console.log(`List of Test IDs without components that have results: ${Array.from(testsWithoutComponentsIds).join(', ')}`);

            // Get names of these tests
            const tests = await db.test.findAll({
                where: {
                    id: {
                        [Op.in]: Array.from(testsWithoutComponentsIds)
                    }
                },
                attributes: ['id', 'name']
            });
            console.log("Test Names:", tests.map(t => `${t.name} (ID: ${t.id})`).join(', '));
        } else {
            console.log(`\nSAFE TO DELETE (maybe): No active usage found for tests without components. All results seem to be redundant or for tests that have components (which likely use component results).`);
            console.log(`However, check if tests WITH components also populate this field redundantly.`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await db.sequelize.close();
    }
}

// Run the check
checkTestResults();
