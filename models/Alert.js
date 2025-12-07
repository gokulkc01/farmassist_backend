const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  farmId: { type: String, required: true, index: true },
  alertType: String,
  severity: String,
  message: String,
  data: mongoose.Schema.Types.Mixed,
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);