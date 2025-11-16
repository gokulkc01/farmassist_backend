// routes/guidance.js
const express = require('express');
const router = express.Router();
const FarmGuidanceService = require('../services/farmGuidanceService');
const Farm = require('../models/Farm');
const auth = require('../middleware/auth');

// @desc    Get farm guidance and recommendations
// @route   GET /api/guidance/:farmId
// @access  Private
router.get('/:farmId', auth, async (req, res) => {
    try {
        const { farmId } = req.params;

        // Validate farm ownership
        const farm = await Farm.findOne({ _id: farmId, owner: req.user.id });
        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found or access denied'
            });
        }

        const guidanceReport = await FarmGuidanceService.generateFarmReport(farmId);

        res.json({
            success: true,
            data: guidanceReport
        });

    } catch (error) {
        console.error('Guidance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating guidance',
            error: error.message
        });
    }
});

module.exports = router;