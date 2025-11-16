// models/SensorData.js
const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    // Farm reference
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true,
        index: true
    },
    
    // Sensor identification
    sensorType: {
        type: String,
        required: true,
        enum: [
            'temperature', 
            'humidity', 
            'soil_moisture', 
            'ph_level', 
            'light_intensity',
            'rainfall',
            'wind_speed',
            'air_pressure'
        ],
        index: true
    },
    
    // Sensor hardware info
    sensorModel: {
        type: String,
        default: 'DHT11',
        enum: ['DHT11', 'DHT22', 'DS18B20', 'YL-69', 'BH1750', 'BMP180', 'Other']
    },
    
    sensorId: {
        type: String,
        required: true,
        default: function() {
            return `sensor_${Math.random().toString(36).substr(2, 9)}`;
        }
    },
    
    // Measurement data
    value: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                // Different validation based on sensor type
                switch(this.sensorType) {
                    case 'temperature':
                        return v >= -40 && v <= 80; // DHT11 range
                    case 'humidity':
                        return v >= 20 && v <= 90; // DHT11 range
                    case 'soil_moisture':
                        return v >= 0 && v <= 100;
                    case 'ph_level':
                        return v >= 0 && v <= 14;
                    default:
                        return true;
                }
            },
            message: 'Value out of sensor range'
        }
    },
    
    unit: {
        type: String,
        required: true,
        enum: ['°C', '°F', '%', 'pH', 'lux', 'mm', 'km/h', 'hPa'],
        default: function() {
            switch(this.sensorType) {
                case 'temperature': return '°C';
                case 'humidity': return '%';
                case 'soil_moisture': return '%';
                case 'ph_level': return 'pH';
                case 'light_intensity': return 'lux';
                case 'rainfall': return 'mm';
                case 'wind_speed': return 'km/h';
                case 'air_pressure': return 'hPa';
                default: return 'unit';
            }
        }
    },
    
    // Location within the farm (if multiple sensors)
    location: {
        name: {
            type: String,
            default: 'Main Field'
        },
        coordinates: {
            lat: {
                type: Number,
                required: true
            },
            lng: {
                type: Number,
                required: true
            }
        },
        zone: {
            type: String,
            enum: ['north', 'south', 'east', 'west', 'central', 'greenhouse', 'open_field'],
            default: 'open_field'
        }
    },
    
    // Data quality and status
    dataQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'invalid'],
        default: 'good'
    },
    
    status: {
        type: String,
        enum: ['active', 'calibrating', 'maintenance', 'offline', 'error'],
        default: 'active'
    },
    
    // Sensor hardware status
    metadata: {
        batteryLevel: {
            type: Number,
            min: 0,
            max: 100,
            default: 100
        },
        signalStrength: {
            type: Number,
            min: 0,
            max: 100,
            default: 100
        },
        readingAttempts: {
            type: Number,
            default: 1
        },
        calibrationOffset: {
            type: Number,
            default: 0
        },
        lastMaintenance: Date,
        nextMaintenance: Date
    },
    
    // Environmental context
    weatherConditions: {
        weather: {
            type: String,
            enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy', 'unknown'],
            default: 'unknown'
        },
        rainfallLast24h: Number, // in mm
        windSpeed: Number, // in km/h
    },
    
    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    recordedAt: {
        type: Date,
        default: Date.now
    }
    
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for sensor description
sensorDataSchema.virtual('sensorDescription').get(function() {
    return `${this.sensorModel} - ${this.sensorType} (${this.sensorId})`;
});

// Virtual for formatted value
sensorDataSchema.virtual('formattedValue').get(function() {
    return `${this.value} ${this.unit}`;
});

// Compound indexes for efficient querying
sensorDataSchema.index({ farmId: 1, sensorType: 1, timestamp: -1 });
sensorDataSchema.index({ farmId: 1, timestamp: -1 });
sensorDataSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });
sensorDataSchema.index({ sensorType: 1, dataQuality: 1 });

// Pre-save middleware to calculate data quality
sensorDataSchema.pre('save', function(next) {
    // Auto-calculate data quality based on value ranges
    if (this.sensorType === 'temperature') {
        if (this.value >= 10 && this.value <= 35) {
            this.dataQuality = 'excellent';
        } else if (this.value >= 5 && this.value <= 40) {
            this.dataQuality = 'good';
        } else {
            this.dataQuality = 'poor';
        }
    }
    
    if (this.sensorType === 'humidity') {
        if (this.value >= 40 && this.value <= 70) {
            this.dataQuality = 'excellent';
        } else if (this.value >= 30 && this.value <= 80) {
            this.dataQuality = 'good';
        } else {
            this.dataQuality = 'poor';
        }
    }
    
    // Set recordedAt to timestamp if not provided
    if (!this.recordedAt) {
        this.recordedAt = this.timestamp;
    }
    
    next();
});

// Static method to get latest readings
sensorDataSchema.statics.getLatestReadings = function(farmId, limit = 10) {
    return this.find({ farmId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('farmId', 'name location');
};

// Static method to get sensor summary
sensorDataSchema.statics.getSensorSummary = function(farmId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                farmId: mongoose.Types.ObjectId(farmId),
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$sensorType',
                count: { $sum: 1 },
                averageValue: { $avg: '$value' },
                minValue: { $min: '$value' },
                maxValue: { $max: '$value' },
                latestValue: { $last: '$value' },
                latestTimestamp: { $last: '$timestamp' }
            }
        }
    ]);
};

// Instance method to check if sensor needs maintenance
sensorDataSchema.methods.needsMaintenance = function() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return !this.metadata.lastMaintenance || 
           this.metadata.lastMaintenance < threeMonthsAgo ||
           this.metadata.batteryLevel < 20;
};

module.exports = mongoose.model('SensorData', sensorDataSchema);