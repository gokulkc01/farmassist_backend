const express = require('express');
const SensorData = require('../models/SensorData');
const Farm = require('../models/Farm');
const auth = require('../middleware/auth');
const { sensorDataValidation } = require('../middleware/validation');

const router = express.Router();

// @desc    Receive sensor data from Raspberry Pi
// @route   POST /api/sensors/data
// @access  Public (should be protected in production)
router.post('/data', sensorDataValidation, async (req, res) => {
    try {
        const { sensorId, farmId, type, value, unit, location } = req.body;

        // Verify farm exists
        const farm = await Farm.findById(farmId);
        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        // Create sensor data record
        const sensorData = await SensorData.create({
            sensorId,
            farmId,
            type,
            value,
            unit,
            location,
            timestamp: new Date()
        });

        // TODO: Emit real-time update via Socket.io
        // req.app.get('io').to(`farm_${farmId}`).emit('sensorUpdate', sensorData);

        // TODO: Check for alerts
        // await checkAlerts(sensorData);

        res.status(201).json({
            success: true,
            message: 'Sensor data recorded successfully',
            data: sensorData
        });

    } catch (error) {
        console.error('Sensor data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving sensor data',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// @desc    Get sensor data for a farm
// @route   GET /api/sensors/farm/:farmId
// @access  Private
router.get('/farm/:farmId', auth, async (req, res) => {
    try {
        const { farmId } = req.params;
        const { type, hours = 24, limit = 100 } = req.query;

        // Verify farm belongs to user
        const farm = await Farm.findOne({ _id: farmId, owner: req.user.id });
        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        const query = { farmId };
        if (type) query.type = type;

        // Calculate timestamp for the last X hours
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        const sensorData = await SensorData.find({
            ...query,
            timestamp: { $gte: startTime }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: sensorData,
            count: sensorData.length
        });

    } catch (error) {
        console.error('Get sensor data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sensor data',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// @desc    Get current sensor readings summary
// @route   GET /api/sensors/farm/:farmId/summary
// @access  Private
router.get('/farm/:farmId/summary', auth, async (req, res) => {
    try {
        const { farmId } = req.params;

        // Verify farm belongs to user
        const farm = await Farm.findOne({ _id: farmId, owner: req.user.id });
        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        const summary = await SensorData.getLatestReadings(farmId);

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Get sensor summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sensor summary',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

module.exports = router;