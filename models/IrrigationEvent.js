// models/IrrigationEvent.js (Enhanced)
// ============================================

const mongoose = require('mongoose');
const irrigationEventSchema = new mongoose.Schema({
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true,
        index: true
    },
    zone: {
        type: String,
        required: true
    },
    deviceId: String, // Edge device that triggered irrigation
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    endedAt: Date,
    duration: Number, // minutes
    amountMM: Number, // water amount in mm
    triggeredBy: {
        type: String,
        enum: ['manual', 'schedule', 'sensor', 'tinyml_edge', 'cloud_ai'],
        default: 'manual'
    },
    trigger: {
        soilMoisture: Number,
        temperature: Number,
        humidity: Number,
        mlConfidence: Number,
        modelUsed: String
    },
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'failed'],
        default: 'scheduled'
    },
    notes: String,
    efficiency: {
        targetMoisture: Number,
        actualMoisture: Number,
        waterUsed: Number,
        costEstimate: Number
    }
}, {
    timestamps: true
});

irrigationEventSchema.index({ farmId: 1, startedAt: -1 });
irrigationEventSchema.index({ triggeredBy: 1, startedAt: -1 });

module.exports = mongoose.model('IrrigationEvent', irrigationEventSchema);