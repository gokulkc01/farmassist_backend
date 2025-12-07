const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  farmId: { type: String, required: true, index: true },
  message: String,
  response: String,
  context: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);