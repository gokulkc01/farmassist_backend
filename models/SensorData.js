const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    sensorId: {
        type: String,
        required: [true, 'Sensor ID is required']
    },
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true
    },
    type: {
        type: String,
        enum: ['temperature', 'humidity', 'soil_moisture', 'rain', 'ph', 'npk', 'wind_speed'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    location: {
        lat: Number,
        lng: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for better query performance
sensorDataSchema.index({ sensorId: 1, timestamp: -1 });
sensorDataSchema.index({ farmId: 1, type: 1, timestamp: -1 });
sensorDataSchema.index({ farmId: 1, timestamp: -1 });

// Static method to get latest readings
sensorDataSchema.statics.getLatestReadings = async function (farmId) {
    return this.aggregate([
        {
            $match: {
                farmId: new mongoose.Types.ObjectId(farmId),
                timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
            }
        },
        {
            $sort: { timestamp: -1 }
        },
        {
            $group: {
                _id: '$type',
                latestValue: { $first: '$value' },
                unit: { $first: '$unit' },
                timestamp: { $first: '$timestamp' },
                sensorId: { $first: '$sensorId' }
            }
        }
    ]);
};

module.exports = mongoose.model('SensorData', sensorDataSchema);