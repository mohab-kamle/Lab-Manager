const express = require('express');
const router = express.Router();
require("dotenv").config();
const { subscription } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');

/**
 * GET: Fetch all active subscription plans
 * This endpoint returns all available subscription plans with their pricing
 * No tenant context needed as subscriptions are global
 */
router.get("/", async (req, res) => {
    try {
        // Get all active subscription plans ordered by sort_order
        let subscriptionPlans = await subscription.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['price', 'ASC']]
        });
        
        // Auto-seed default subscriptions if the table is completely empty
        if (subscriptionPlans.length === 0) {
            const { defaultSubscriptions } = require('../scripts/setup/seedSubscriptions');
            await subscription.bulkCreate(defaultSubscriptions);
            
            // Refetch after seeding
            subscriptionPlans = await subscription.findAll({
                where: { is_active: true },
                order: [['sort_order', 'ASC'], ['price', 'ASC']]
            });
        }

        res.json(subscriptionPlans);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: "Server error while fetching subscription plans" });
    }
});

/**
 * GET: Fetch subscription plan by ID
 * Returns a specific subscription plan by its ID
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        const subscriptionPlan = await subscription.findOne({
            where: { id, is_active: true }
        });
        
        if (!subscriptionPlan) {
            return res.status(404).json({ error: "Subscription plan not found" });
        }
        
        res.json(subscriptionPlan);
    } catch (error) {
        console.error('Error fetching subscription plan:', error);
        res.status(500).json({ error: "Server error while fetching subscription plan" });
    }
});

/**
 * GET: Fetch subscription plans by duration type
 * Returns subscription plans filtered by duration type (e.g., monthly, yearly)
 */
router.get("/duration/:durationType", async (req, res) => {
    try {
        const { durationType } = req.params;
        
        // Validate duration type
        const validDurations = ['free_trial', 'monthly', '3_months', '6_months', 'yearly'];
        if (!validDurations.includes(durationType)) {
            return res.status(400).json({ error: "Invalid duration type" });
        }
        
        const subscriptionPlans = await subscription.findAll({
            where: { 
                duration_type: durationType,
                is_active: true 
            },
            order: [['price', 'ASC']]
        });
        
        res.json(subscriptionPlans);
    } catch (error) {
        console.error('Error fetching subscription plans by duration:', error);
        res.status(500).json({ error: "Server error while fetching subscription plans" });
    }
});

// Admin-only routes for managing subscription plans

/**
 * POST: Create a new subscription plan (Admin only)
 * Creates a new subscription plan with the provided details
 */
router.post("/", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const {
            name,
            duration_type,
            duration_value,
            price,
            currency = 'USD',
            description,
            features,
            max_labs,
            max_users,
            max_patients,
            is_popular = false,
            sort_order = 0
        } = req.body;
        
        // Validate required fields
        if (!name || !duration_type || !duration_value || price === undefined) {
            return res.status(400).json({ 
                error: "Name, duration_type, duration_value, and price are required" 
            });
        }
        
        // Validate duration type
        const validDurations = ['free_trial', 'monthly', '3_months', '6_months', 'yearly'];
        if (!validDurations.includes(duration_type)) {
            return res.status(400).json({ error: "Invalid duration type" });
        }
        
        // Check if subscription plan with same name already exists
        const existingPlan = await subscription.findOne({ where: { name } });
        if (existingPlan) {
            return res.status(400).json({ error: "Subscription plan with this name already exists" });
        }
        
        const newSubscriptionPlan = await subscription.create({
            name,
            duration_type,
            duration_value,
            price,
            currency,
            description,
            features,
            max_labs,
            max_users,
            max_patients,
            is_popular,
            sort_order
        });
        
        res.status(201).json(newSubscriptionPlan);
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        res.status(500).json({ error: "Failed to create subscription plan" });
    }
});

/**
 * PUT: Update a subscription plan (Admin only)
 * Updates an existing subscription plan with new details
 */
router.put("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Validate duration type if provided
        if (updateData.duration_type) {
            const validDurations = ['free_trial', 'monthly', '3_months', '6_months', 'yearly'];
            if (!validDurations.includes(updateData.duration_type)) {
                return res.status(400).json({ error: "Invalid duration type" });
            }
        }
        
        const subscriptionPlan = await subscription.findByPk(id);
        if (!subscriptionPlan) {
            return res.status(404).json({ error: "Subscription plan not found" });
        }
        
        // Check if name is being changed and if it conflicts with existing plans
        if (updateData.name && updateData.name !== subscriptionPlan.name) {
            const existingPlan = await subscription.findOne({ 
                where: { name: updateData.name } 
            });
            if (existingPlan) {
                return res.status(400).json({ 
                    error: "Subscription plan with this name already exists" 
                });
            }
        }
        
        await subscriptionPlan.update(updateData);
        res.json(subscriptionPlan);
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: "Failed to update subscription plan" });
    }
});

/**
 * DELETE: Delete a subscription plan (Admin only)
 * Soft delete by setting is_active to false
 */
router.delete("/:id", authenticateUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        
        const subscriptionPlan = await subscription.findByPk(id);
        if (!subscriptionPlan) {
            return res.status(404).json({ error: "Subscription plan not found" });
        }
        
        // Soft delete by setting is_active to false
        await subscriptionPlan.update({ is_active: false });
        
        res.json({ message: "Subscription plan deactivated successfully" });
    } catch (error) {
        console.error('Error deleting subscription plan:', error);
        res.status(500).json({ error: "Failed to delete subscription plan" });
    }
});

module.exports = router;