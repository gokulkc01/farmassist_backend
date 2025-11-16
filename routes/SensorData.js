const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const Farm = require('../models/Farm');
const auth = require('../middleware/auth');

router.post('/',auth, async (req, res) =>{
    try {
      const {farmId, sensorType, value, unit, location, metadata } = req.body;

      const farm = await Farm.findOne({_id: farmId, owner: req.user.id });
      if(!farm) {
        return res.status(404).json({
            success: false,
            message: 'Farm not found or access denied'
        });
      }

      const sensorData = await SensorData.create({
        farmId,
        sensorType,
        value: parseFloat(value),
        unit,
        location,
        metadata,
        timestamp: new Date()
      });
      res.status(201).json({
        success: true,
        message: 'Sensor data recorded successfully',
        data: sensorData
      });
    } catch (error) {
        console.error('Sensor data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording sensor data',
            error: error.message
        });
    }
});

// @desc    Get sensor data for a farm
// @route   GET /api/sensor-data/:farmId
// @access  Private

router.get('/:farmId', auth, async(req, res) => {
    try{
        const { farmId } = req.params;
        const { sensorType, startDate, endDate, limit = 100 } = req.query;

        //Validate farm ownership
        const farm = await Farm.findOne({_id: farmId, owner: req.user.id });
        if(!farm){
            return res.status(404).json({
                success: false,
                message: 'Farm not found or access denied'
            });
        }
            //Build query
            let query = { farmId };

            if(sensorType) {
                query.sensorType = sensorType;
            }

            if(startDate || endDate) {
                query.timestamp = {};
                if(startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }
            const sensorData = (await SensorData.find(query)).toSorted({timestamp: -1}).limit(parseInt(limit));
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
            error: error.message
        });  
        }
});

// @desc    Get sensor data summary for dashboard
// @route   GET /api/sensor-data/:farmId/summary
// @access  Private
router.get('/:farmId/summary', auth, async (req, res) => {
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

        // Get latest data for each sensor type
        const summary = await SensorData.aggregate([
            { $match: { farmId: mongoose.Types.ObjectId(farmId) } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$sensorType",
                    latestValue: { $first: "$value" },
                    latestUnit: { $first: "$unit" },
                    latestTimestamp: { $first: "$timestamp" },
                    averageValue: { $avg: "$value" },
                    minValue: { $min: "$value" },
                    maxValue: { $max: "$value" }
                }
            }
        ]);

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Sensor summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sensor summary',
            error: error.message
        });
    }
});

module.exports = router;