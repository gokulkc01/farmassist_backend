// models/MLInference.js
// ============================================

const mongoose =require('mongoose');
const mlInferenceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    inferenceType: {
        type: String,
        required: true,
        enum: [
            'soil_moisture',
            'irrigation_decision',
            'anomaly_detection',
            'water_stress_prediction',
            'fertilizer_recommendation'
        ],
        index: true
    },
    inputData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    outputData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },
    isAnomaly: {
        type: Boolean,
        default: false
    },
    action: {
        type: String,
        enum: ['irrigate', 'fertilize', 'alert', 'hold', 'none'],
        default: 'none'
    },
    actionTaken: {
        type: Boolean,
        default: false
    },
    actionTimestamp: Date,
    modelVersion: String,
    processingTime: Number, // milliseconds
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    metadata: {
        edgeProcessed: {
            type: Boolean,
            default: true
        },
        cloudVerified: {
            type: Boolean,
            default: false
        },
        notes: String
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
mlInferenceSchema.index({ deviceId: 1, timestamp: -1 });
mlInferenceSchema.index({ inferenceType: 1, isAnomaly: 1, timestamp: -1 });
mlInferenceSchema.index({ deviceId: 1, action: 1, timestamp: -1 });

// Static method to get recent inferences by device
mlInferenceSchema.statics.getRecentByDevice = function(deviceId, limit = 100) {
    return this.find({ deviceId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get inference statistics
mlInferenceSchema.statics.getStatistics = async function(deviceId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                deviceId,
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$inferenceType',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidence' },
                anomalies: {
                    $sum: { $cond: ['$isAnomaly', 1, 0] }
                },
                actions: {
                    $sum: { $cond: ['$actionTaken', 1, 0] }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('MLInference', mlInferenceSchema);