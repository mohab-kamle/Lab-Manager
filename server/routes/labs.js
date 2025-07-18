const express = require('express');
const router = express.Router();
const { lab, employee } = require('../models');
const authenticateUser = require('../middleware/authenticateUser');

// Get all labs owned by the user
router.get('/', authenticateUser, async (req, res) => {
    try {
        const labs = await lab.findAll({
            where: { owner_id: req.user.id },
            order: [['name', 'ASC']]
        });
        res.json(labs);
    } catch (error) {
        console.error('Error fetching labs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single lab
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const labData = await lab.findOne({
            where: { 
                id: req.params.id,
                owner_id: req.user.id
            }
        });
        
        if (!labData) {
            return res.status(404).json({ error: 'Lab not found' });
        }
        res.json(labData);
    } catch (error) {
        console.error('Error fetching lab:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 