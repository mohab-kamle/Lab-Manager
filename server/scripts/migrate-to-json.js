const path = require('path');
// Load db context directly
const db = require(path.join(__dirname, '../models/index.js'));
const { sequelize } = db;

async function migrateToJson() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🚀 Starting Data Migration to JSON...');

        // PART A: Standard Tests
        console.log('📋 Part A: Migrating Standard Tests...');
        const [tests] = await sequelize.query(`SELECT id, name FROM test WHERE type = 'single'`, { transaction });
        for (const test of tests) {
            const [components] = await sequelize.query(`SELECT * FROM test_components WHERE test_id = ?`, {
                replacements: [test.id],
                transaction
            }).catch(() => [[], []]);
            if (components.length > 0) {
                const config = components.map(c => ({
                    parameter_key: c.name,
                    min_val: c.min_val,
                    max_val: c.max_val,
                    unit: c.unit,
                    reference_range: c.reference_range
                }));
                await sequelize.query(`UPDATE test SET structure_config = ? WHERE id = ?`, {
                    replacements: [JSON.stringify(config), test.id],
                    transaction
                });
            }
        }

        // PART B: Panels/Groups
        console.log('📂 Part B: Migrating Panels/Groups...');
        const [groups] = await sequelize.query(`SELECT * FROM test_groups`, { transaction }).catch(() => [[], []]);
        for (const group of groups) {
            // Create new row in test for Group
            // Safely default category_id to 1 if we don't know it, or find an existing one
            const [newTestResult] = await sequelize.query(`
        INSERT INTO test (name, shortcut, type, category_id, createdAt, updatedAt) 
        VALUES (?, ?, 'panel', 1, NOW(), NOW())
      `, {
                replacements: [group.name, group.shortcut || null],
                transaction
            });
            const newTestId = newTestResult; // MySQL row insert ID

            // Get all components for this group
            const [groupTests] = await sequelize.query(`
        SELECT t.id, t.name 
        FROM test_group_test tgt 
        JOIN test t ON t.id = tgt.test_id 
        WHERE tgt.test_group_id = ?
      `, {
                replacements: [group.id],
                transaction
            }).catch(() => [[], []]);

            const config = groupTests.map(t => ({
                test_id: t.id,
                name: t.name
            }));

            await sequelize.query(`UPDATE test SET structure_config = ? WHERE id = ?`, {
                replacements: [JSON.stringify(config), newTestId],
                transaction
            });
        }

        // PART C: The Culture Blueprint
        console.log('🦠 Part C: Migrating Cultures...');
        const [cultures] = await sequelize.query(`SELECT * FROM cultures`, { transaction }).catch(() => [[], []]);
        const cultureIdMap = {}; // Maps old_culture_id to new_test_id
        for (const culture of cultures) {
            const defaultCultureConfig = {
                options: ["Positive", "Negative"],
                organisms_expected: true,
                antibiotics_expected: true
            };
            const [newCultureResult] = await sequelize.query(`
        INSERT INTO test (name, shortcut, type, category_id, structure_config, createdAt, updatedAt) 
        VALUES (?, ?, 'culture', 1, ?, NOW(), NOW())
      `, {
                replacements: [culture.name, culture.shortcut || null, JSON.stringify(defaultCultureConfig)],
                transaction
            });
            cultureIdMap[culture.id] = newCultureResult;
        }

        // PART D: Relational Merge
        console.log('🔗 Part D: Relational Merge (Billing & Orders)...');

        // medical_report_has_culture -> medical_report_has_test
        const [mrCultures] = await sequelize.query(`SELECT * FROM medical_report_has_culture`, { transaction }).catch(() => [[], []]);
        for (const mrc of mrCultures) {
            const newTestId = cultureIdMap[mrc.culture_id];
            if (newTestId) {
                await sequelize.query(`
          INSERT IGNORE INTO medical_report_has_test (medical_report_id, test_id, status, result) 
          VALUES (?, ?, 'pending', NULL)
        `, {
                    replacements: [mrc.medical_report_id, newTestId],
                    transaction
                });
            }
        }

        // bill_has_culture -> bill_has_test
        const [billCultures] = await sequelize.query(`SELECT * FROM bill_has_culture`, { transaction }).catch(() => [[], []]);
        for (const bc of billCultures) {
            const newTestId = cultureIdMap[bc.culture_id];
            if (newTestId) {
                await sequelize.query(`
          INSERT IGNORE INTO bill_has_test (bill_id, test_id, price) 
          VALUES (?, ?, ?)
        `, {
                    replacements: [bc.bill_id, newTestId, bc.price || 0],
                    transaction
                });
            }
        }

        // PART E: Patient Results
        console.log('🧪 Part E: Migrating Patient Results...');

        const [results] = await sequelize.query(`SELECT * FROM medical_report_results`, { transaction }).catch(() => [[], []]);
        for (const res of results) {
            if (res.test_component_id) {
                const [comp] = await sequelize.query(`SELECT * FROM test_components WHERE id = ?`, {
                    replacements: [res.test_component_id],
                    transaction
                }).catch(() => [[], []]);

                if (comp.length > 0) {
                    const c = comp[0];
                    const resultVal = {
                        value: res.result || null,
                        unit: c.unit || null
                    };

                    await sequelize.query(`
             UPDATE medical_report_results 
             SET test_id = ?, parameter_key = ?, result_value = ?, clinical_flag = ? 
             WHERE id = ?
           `, {
                        replacements: [
                            c.test_id,
                            c.name,
                            JSON.stringify(resultVal),
                            res.status === 'normal' ? 'normal' : null,
                            res.id
                        ],
                        transaction
                    });
                }
            }
        }

        // Migrating historical culture results into single unified medical_report_results
        const [cultureResults] = await sequelize.query(`SELECT * FROM culture_results`, { transaction }).catch(() => [[], []]);
        for (const cr of cultureResults) {
            const newTestId = cultureIdMap[cr.culture_id];
            if (newTestId) {
                // Fetch matching antibiotics for this report and culture
                const [antiResults] = await sequelize.query(`
          SELECT * FROM culture_antibiotics 
          WHERE medical_report_id = ? AND culture_id = ?
        `, {
                    replacements: [cr.medical_report_id, cr.culture_id],
                    transaction
                }).catch(() => [[], []]);

                const resultVal = {
                    organism: cr.organism_name || null,
                    colony_count: cr.colony_count || null,
                    sensitivities: antiResults.map(a => ({
                        antibiotic: a.antibiotic_name,
                        sensitivity: a.sensitivity
                    }))
                };

                await sequelize.query(`
          INSERT INTO medical_report_results (medical_report_id, test_id, result_value, workflow_status, createdAt, updatedAt) 
          VALUES (?, ?, ?, 'approved', NOW(), NOW())
        `, {
                    replacements: [cr.medical_report_id, newTestId, JSON.stringify(resultVal)],
                    transaction
                });
            }
        }

        await transaction.commit();
        console.log('✅ Migration to JSON architecture completed successfully!');
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Migration failed, transaction aborted:', error);
    } finally {
        await sequelize.close();
    }
}

migrateToJson();
