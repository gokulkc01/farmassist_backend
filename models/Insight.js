const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  timestamp: { type: Number, required: true, index: true },
  deviceId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  soilMoisture: Number,
  moistureTrend: String,
  predictedMoisture6h: Number,
  irrigationNeed: String,
  temperature: Number,
  humidity: Number,
  ph: Number,
  ec: Number,
  lightIntensity: Number,
  cropStage: String,
  anomaly: Boolean,
  moistureStats: {
    mean: Number,
    std: Number,
    min: Number,
    max: Number,
    trend: Number
  },
  createdAt: { type: Date, default: Date.now }
});

insightSchema.index({ farmId: 1, timestamp: -1 });

module.exports = mongoose.model('Insight', insightSchema);