const mongoose = require('mongoose');

const irrigationLogSchema = new mongoose.Schema({
  farmId: { type: String, required: true, index: true },
  timestamp: Number,
  duration: Number,
  waterAmount: Number,
  method: String,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IrrigationLog', irrigationLogSchema);