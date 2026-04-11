const { sequelize, test, test_group, test_component } = require('../models');

async function migrateTestsToJson() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- Starting Architecture Migration ---');

        // 1. Fetch all existing test_groups
        const groups = await test_group.findAll({ transaction });
        console.log(`Found ${groups.length} test groups to convert.`);

        for (const group of groups) {
            // 2. Converts the parent test_group into a new test record with type: 'panel'
            const newPanel = await test.create({
                name: group.name,
                price: group.price || 0,
                cost: group.cost || 0,
                type: 'panel',
                category_id: 1, // Defaulting as test_group doesn't explicitly store category directly in this context without joins
                structure_config: []
            }, { transaction });

            console.log(`Created panel test from group: ${newPanel.name}`);
        }

        // 3. Fetches all existing test_components for each test
        const tests = await test.findAll({ transaction });
        console.log(`Found ${tests.length} tests to migrate components into JSON.`);

        for (const t of tests) {
            let components = [];
            try {
                components = await test_component.findAll({
                    where: { test_id: t.id },
                    transaction
                });
            } catch (err) {
                if (t.id === tests[0]?.id) {
                    console.log(`⚠️  test_component table appears to be dropped. Skipping component migration...`);
                }
                break; // Stop trying to query the dropped table for the rest of the loops
            }

            if (components && components.length > 0) {
                // 4. Maps the old columns into our new JSON schema array format
                const structure = components.map((comp) => {
                    let fieldType = comp.result_type === 'boolean' ? 'options' : 'numeric';

                    return {
                        key: comp.name ? comp.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `field_${comp.id}`,
                        label: comp.name || 'Unknown',
                        type: fieldType,
                        unit: comp.unit || '',
                        reference_ranges: [
                            {
                                gender: comp.gender ? comp.gender.toLowerCase() : null,
                                age_min: comp.age_start || null,
                                age_max: comp.age_end || null,
                                min: comp.normal_from ? parseFloat(comp.normal_from) : null,
                                max: comp.normal_to ? parseFloat(comp.normal_to) : null,
                                panic_min: comp.c_low ? parseFloat(comp.c_low) : null,
                                panic_max: comp.c_high ? parseFloat(comp.c_high) : null
                            }
                        ]
                    };
                });

                // 5. Updates the corresponding test record
                const testType = t.type === 'panel' ? 'panel' : (structure.length > 1 ? 'panel' : 'single');
                await t.update({
                    structure_config: structure,
                    type: testType
                }, { transaction });

                console.log(`Migrated test ID ${t.id} ("${t.name}") => ${structure.length} JSON properties.`);
            }
        }

        await transaction.commit();
        console.log('--- Data Migration Completed Successfully! ---');
        process.exit(0);

    } catch (error) {
        console.error('Migration Failed:', error);
        await transaction.rollback();
        process.exit(1);
    }
}

migrateTestsToJson();
