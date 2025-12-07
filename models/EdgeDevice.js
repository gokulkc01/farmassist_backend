// models/EdgeDevice.js
const mongoose = require('mongoose');

const edgeDeviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deviceType: {
        type: String,
        enum: ['ESP32', 'Arduino', 'RaspberryPi', 'Other'],
        default: 'ESP32'
    },
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true,
        index: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    location: {
        name: String,
        zone: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    firmwareVersion: {
        type: String,
        default: '1.0.0'
    },
    capabilities: {
        hasAnomalyDetection: {
            type: Boolean,
            default: false
        },
        hasIrrigationControl: {
            type: Boolean,
            default: false
        },
        hasPredictiveAnalysis: {
            type: Boolean,
            default: false
        },
        sensors: [{
            type: String,
            enum: ['soil_moisture', 'temperature', 'humidity', 'ph_level', 'light']
        }]
    },
    deployedModels: [{
        modelId: String,
        modelName: String,
        version: String,
        deployedAt: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    status: {
        type: String,
        enum: ['online', 'offline', 'error', 'maintenance'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    telemetry: {
        batteryLevel: {
            type: Number,
            min: 0,
            max: 100
        },
        signalStrength: {
            type: Number,
            min: 0,
            max: 100
        },
        memoryUsage: {
            type: Number,
            min: 0,
            max: 100
        },
        uptime: Number, // seconds
        lastUpdate: Date
    },
    statistics: {
        totalInferences: {
            type: Number,
            default: 0
        },
        anomaliesDetected: {
            type: Number,
            default: 0
        },
        irrigationsTriggered: {
            type: Number,
            default: 0
        },
        averageConfidence: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
edgeDeviceSchema.index({ farmId: 1, status: 1 });
edgeDeviceSchema.index({ owner: 1, lastSeen: -1 });

// Virtual for device health
edgeDeviceSchema.virtual('health').get(function() {
    if (!this.telemetry || !this.telemetry.batteryLevel) return 'unknown';
    
    const battery = this.telemetry.batteryLevel;
    const signal = this.telemetry.signalStrength || 100;
    
    if (battery < 20 || signal < 30) return 'critical';
    if (battery < 40 || signal < 50) return 'warning';
    return 'good';
});

// Method to check if device needs maintenance
edgeDeviceSchema.methods.needsMaintenance = function() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return !this.lastSeen || this.lastSeen < oneWeekAgo || 
           (this.telemetry && this.telemetry.batteryLevel < 20);
};

module.exports = mongoose.model('EdgeDevice', edgeDeviceSchema);