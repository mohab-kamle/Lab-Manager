const express = require('express');
const router = express.Router();
const { packages_and_offers, pao_has_test, pao_has_culture, admin_packages_and_offers, test, culture } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const { tenantContext } = require('../middleware/tenantContext');

// Get all packages and offers for the user
router.get('/', authenticateUser, authorizeRoles('admin', 'receptionist', 'chemist', 'doctor', 'employee'), tenantContext, async (req, res) => {
    try {
        console.log('Fetching packages and offers...');
        const packagesAndOffers = await packages_and_offers.findAll({
            order: [['name', 'ASC']]
        });
        console.log('Found packages and offers:', packagesAndOffers.length);

        if (!packagesAndOffers || packagesAndOffers.length === 0) {
            return res.json([]);
        }

        // Get all tests and cultures for the packages/offers
        const packageAndOfferIds = packagesAndOffers.map(item => item.id);
        console.log('Package/Offer IDs:', packageAndOfferIds);
        
        const [testAssociations, cultureAssociations] = await Promise.all([
            pao_has_test.findAll({
                where: {  packages_and_offers_id: packageAndOfferIds , lab_id: req.tenant.lab_id }
            }),
            pao_has_culture.findAll({
                where: {  packages_and_offers_id: packageAndOfferIds , lab_id: req.tenant.lab_id }
            })
        ]);
        console.log('Test associations:', testAssociations.length);
        console.log('Culture associations:', cultureAssociations.length);

        // Get all unique test and culture IDs
        const testIds = [...new Set(testAssociations.map(t => t.test_id))];
        const cultureIds = [...new Set(cultureAssociations.map(c => c.culture_id))];
        console.log('Unique test IDs:', testIds);
        console.log('Unique culture IDs:', cultureIds);

        // Fetch all tests and cultures
        const [tests, cultures] = await Promise.all([
            testIds.length > 0 ? test.findAll({ where: {  id: testIds , lab_id: req.tenant.lab_id } }) : [],
            cultureIds.length > 0 ? culture.findAll({ where: {  id: cultureIds , lab_id: req.tenant.lab_id } }) : []
        ]);
        console.log('Found tests:', tests.length);
        console.log('Found cultures:', cultures.length);

        // Create lookup maps for tests and cultures
        const testMap = new Map(tests.map(t => [t.id, t]));
        const cultureMap = new Map(cultures.map(c => [c.id, c]));

        // Combine the data
        const result = packagesAndOffers.map(item => {
            const itemTests = testAssociations
                .filter(t => t.packages_and_offers_id === item.id)
                .map(t => testMap.get(t.test_id))
                .filter(Boolean); // Remove any undefined values
            const itemCultures = cultureAssociations
                .filter(c => c.packages_and_offers_id === item.id)
                .map(c => cultureMap.get(c.culture_id))
                .filter(Boolean); // Remove any undefined values

            console.log(`Package ${item.id} has ${itemTests.length} tests and ${itemCultures.length} cultures`);

            return {
                ...item.toJSON(),
                tests: itemTests,
                cultures: itemCultures
            };
        });

        console.log('Successfully processed', result.length, 'packages and offers');
        res.json(result);
    } catch (error) {
        console.error('Detailed error in packages and offers route:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            stack: error.stack
        });
    }
});

// Get a single package/offer
router.get('/:id', authenticateUser, tenantContext, async (req, res) => {
    try {
        const packageAndOffer = await packages_and_offers.findOne({
            where: {  id: req.params.id , lab_id: req.tenant.lab_id }
        });
        
        if (!packageAndOffer) {
            return res.status(404).json({ error: 'Package/Offer not found' });
        }

        // Get associated tests and cultures
        const [testAssociations, cultureAssociations] = await Promise.all([
            pao_has_test.findAll({
                where: {  packages_and_offers_id: req.params.id , lab_id: req.tenant.lab_id }
            }),
            pao_has_culture.findAll({
                where: {  packages_and_offers_id: req.params.id , lab_id: req.tenant.lab_id }
            })
        ]);

        // Get test and culture IDs
        const testIds = testAssociations.map(t => t.test_id);
        const cultureIds = cultureAssociations.map(c => c.culture_id);

        // Fetch tests and cultures
        const [tests, cultures] = await Promise.all([
            testIds.length > 0 ? test.findAll({ where: {  id: testIds , lab_id: req.tenant.lab_id } }) : [],
            cultureIds.length > 0 ? culture.findAll({ where: {  id: cultureIds , lab_id: req.tenant.lab_id } }) : []
        ]);

        const result = {
            ...packageAndOffer.toJSON(),
            tests: tests,
            cultures: cultures
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching package/offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new package/offer
router.post('/', authenticateUser, authorizeRoles('admin'), tenantContext, async (req, res) => {
    try {
        const { name, shortcut, price, start_date, end_date, type, tests, cultures, item_id, item_type } = req.body;
        console.log('Received request body:', { name, shortcut, price, start_date, end_date, type, tests, cultures, item_id, item_type });

        // Validate required fields
        if (!name || !price || !type) {
            console.log('Missing required fields:', { name, price, type });
            return res.status(400).json({ error: 'Name, price, and type are required fields' });
        }

        // Start a transaction to ensure data consistency
        const transaction = await packages_and_offers.sequelize.transaction();
        console.log('Transaction started');

        try {
            const newPackageAndOffer = await packages_and_offers.create({
                name,
                shortcut,
                price,
                start_date,
                end_date,
                type
            }, { transaction });
            console.log('Created new package/offer:', newPackageAndOffer.toJSON());

            if (!newPackageAndOffer || !newPackageAndOffer.id) {
                throw new Error('Failed to create package/offer - ID is null');
            }

            // Create admin association
            await admin_packages_and_offers.create({
                admin_id: req.user.id,
                package_and_offer_id: newPackageAndOffer.id
            }, { transaction });

            // Handle tests
            if (tests && tests.length > 0) {
                // First verify that all test IDs exist and are valid numbers
                const testIds = tests.map(id => parseInt(id));
                if (testIds.some(isNaN)) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'Invalid test IDs provided' });
                }

                const existingTests = await test.findAll({
                    where: {  id: testIds , lab_id: req.tenant.lab_id }
                });
                
                if (existingTests.length !== tests.length) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'One or more test IDs do not exist' });
                }

                await Promise.all(tests.map(testId => 
                    pao_has_test.create({
                        packages_and_offers_id: newPackageAndOffer.id,
                        test_id: parseInt(testId)
                    }, { transaction })
                ));
            }

            // Handle cultures
            if (cultures && cultures.length > 0) {
                // First verify that all culture IDs exist and are valid numbers
                const cultureIds = cultures.map(id => parseInt(id));
                if (cultureIds.some(isNaN)) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'Invalid culture IDs provided' });
                }

                const existingCultures = await culture.findAll({
                    where: {  id: cultureIds , lab_id: req.tenant.lab_id }
                });
                
                if (existingCultures.length !== cultures.length) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'One or more culture IDs do not exist' });
                }

                await Promise.all(cultures.map(cultureId => 
                    pao_has_culture.create({
                        packages_and_offers_id: newPackageAndOffer.id,
                        culture_id: parseInt(cultureId)
                    }, { transaction })
                ));
            }

            // Handle offer item
            if (item_id && item_type) {
                if (item_type === "test") {
                    await pao_has_test.create({
                        packages_and_offers_id: newPackageAndOffer.id,
                        test_id: item_id
                    }, { transaction });
                } else if (item_type === "culture") {
                    await pao_has_culture.create({
                        packages_and_offers_id: newPackageAndOffer.id,
                        culture_id: item_id
                    }, { transaction });
                }
            }

            // Commit the transaction
            await transaction.commit();

            // Get the created item with its associations
            const [testAssociations, cultureAssociations] = await Promise.all([
                pao_has_test.findAll({
                    where: {  packages_and_offers_id: newPackageAndOffer.id , lab_id: req.tenant.lab_id }
                }),
                pao_has_culture.findAll({
                    where: {  packages_and_offers_id: newPackageAndOffer.id , lab_id: req.tenant.lab_id }
                })
            ]);

            // Get test and culture IDs
            const testIds = testAssociations.map(t => t.test_id);
            const cultureIds = cultureAssociations.map(c => c.culture_id);

            // Fetch tests and cultures
            const [createdTests, createdCultures] = await Promise.all([
                testIds.length > 0 ? test.findAll({ where: {  id: testIds , lab_id: req.tenant.lab_id } }) : [],
                cultureIds.length > 0 ? culture.findAll({ where: {  id: cultureIds , lab_id: req.tenant.lab_id } }) : []
            ]);

            const result = {
                ...newPackageAndOffer.toJSON(),
                tests: createdTests,
                cultures: createdCultures
            };

            res.status(201).json(result);
        } catch (error) {
            // Rollback the transaction if anything fails
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error creating package/offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a package/offer
router.put('/:id', authenticateUser, tenantContext, async (req, res) => {
    try {
        const { name, shortcut, price, start_date, end_date, type, tests, cultures, item_id, item_type } = req.body;

        // Start a transaction
        const transaction = await packages_and_offers.sequelize.transaction();

        try {
            // Verify that the package/offer exists
            const packageAndOffer = await packages_and_offers.findOne({
                where: {  id: req.params.id , lab_id: req.tenant.lab_id }
            }, { transaction });

            if (!packageAndOffer) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Package/Offer not found' });
            }

            // Update the package/offer
            await packages_and_offers.update(
                { 
                    name,
                    shortcut,
                    price,
                    start_date,
                    end_date,
                    type
                },
                { 
                    where: { id: req.params.id },
                    transaction 
                }
            );

            // Delete existing associations
            await pao_has_test.destroy({ 
                where: { packages_and_offers_id: req.params.id },
                transaction 
            });
            await pao_has_culture.destroy({ 
                where: { packages_and_offers_id: req.params.id },
                transaction 
            });

            if (type === "package") {
                // Handle package tests
                if (tests && tests.length > 0) {
                    // First verify that all test IDs exist and are valid numbers
                    const testIds = tests.map(id => parseInt(id));
                    if (testIds.some(isNaN)) {
                        await transaction.rollback();
                        return res.status(400).json({ error: 'Invalid test IDs provided' });
                    }

                    const existingTests = await test.findAll({
                        where: {  id: testIds , lab_id: req.tenant.lab_id }
                    });
                    
                    if (existingTests.length !== tests.length) {
                        await transaction.rollback();
                        return res.status(400).json({ error: 'One or more test IDs do not exist' });
                    }

                    await Promise.all(tests.map(testId => 
                        pao_has_test.create({
                            packages_and_offers_id: req.params.id,
                            test_id: parseInt(testId)
                        }, { transaction })
                    ));
                }

                // Handle package cultures
                if (cultures && cultures.length > 0) {
                    await Promise.all(cultures.map(cultureId => 
                        pao_has_culture.create({
                            packages_and_offers_id: req.params.id,
                            culture_id: parseInt(cultureId)
                        }, { transaction })
                    ));
                }
            } else if (type === "offer") {
                // Handle offer item
                if (item_id && item_type) {
                    if (item_type === "test") {
                        await pao_has_test.create({
                            packages_and_offers_id: req.params.id,
                            test_id: item_id
                        }, { transaction });
                    } else if (item_type === "culture") {
                        await pao_has_culture.create({
                            packages_and_offers_id: req.params.id,
                            culture_id: item_id
                        }, { transaction });
                    }
                }
            }

            // Commit the transaction
            await transaction.commit();

            // Get the updated item with its associations
            const [testAssociations, cultureAssociations] = await Promise.all([
                pao_has_test.findAll({
                    where: {  packages_and_offers_id: req.params.id , lab_id: req.tenant.lab_id }
                }),
                pao_has_culture.findAll({
                    where: {  packages_and_offers_id: req.params.id , lab_id: req.tenant.lab_id }
                })
            ]);

            // Get test and culture IDs
            const testIds = testAssociations.map(t => t.test_id);
            const cultureIds = cultureAssociations.map(c => c.culture_id);

            // Fetch tests and cultures
            const [updatedTests, updatedCultures] = await Promise.all([
                testIds.length > 0 ? test.findAll({ where: {  id: testIds , lab_id: req.tenant.lab_id } }) : [],
                cultureIds.length > 0 ? culture.findAll({ where: {  id: cultureIds , lab_id: req.tenant.lab_id } }) : []
            ]);

            const result = {
                ...packageAndOffer.toJSON(),
                tests: updatedTests,
                cultures: updatedCultures
            };

            res.json(result);
        } catch (error) {
            // Rollback the transaction if anything fails
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error updating package/offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a package/offer
router.delete('/:id', authenticateUser, tenantContext, async (req, res) => {
    try {
        // Start a transaction
        const transaction = await packages_and_offers.sequelize.transaction();

        try {
            // Verify that the package/offer exists
            const packageAndOffer = await packages_and_offers.findOne({
                where: {  id: req.params.id , lab_id: req.tenant.lab_id }
            }, { transaction });

            if (!packageAndOffer) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Package/Offer not found' });
            }

            // Delete from admin_packages_and_offers first (due to foreign key constraints)
            await admin_packages_and_offers.destroy({ 
                where: { package_and_offer_id: req.params.id },
                transaction 
            });

            // Delete from pao_has_test
            await pao_has_test.destroy({ 
                where: { packages_and_offers_id: req.params.id },
                transaction 
            });

            // Delete from pao_has_culture
            await pao_has_culture.destroy({ 
                where: { packages_and_offers_id: req.params.id },
                transaction 
            });

            // Finally delete the package/offer
            await packages_and_offers.destroy({ 
                where: { id: req.params.id },
                transaction 
            });

            // Commit the transaction
            await transaction.commit();

            res.json({ message: 'Package/Offer deleted successfully' });
        } catch (error) {
            // Rollback the transaction if anything fails
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error deleting package/offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 