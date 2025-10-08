const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cropName: {
        type: String,
        required: true
    },
    district: String,
    alertType: {
        type: String,
        enum: ['price_drop', 'price_increase', 'target_price', 'trend_change'],
        required: true
    },
    targetPrice: Number,
    condition: {
        type: String,
        enum: ['above', 'below', 'change_percentage'],
        required: true
    },
    threshold: Number, // Percentage or absolute value
    isActive: {
        type: Boolean,
        default: true
    },
    lastTriggered: Date,
    notificationFrequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly'],
        default: 'immediate'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PriceAlert', priceAlert);