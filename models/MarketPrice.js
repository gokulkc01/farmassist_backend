const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
    cropName: {
        type: String,
        required: [true, 'Crop name is required'],
        trim: true,
        index: true
    },
    variety: {
        type: String,
        default: 'Common'
    },
    marketName: {
        type: String,
        required: [true, 'Market name is required'],
        trim: true
    },
    district: {
        type: String,
        required: [true, 'District is required'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    minPrice: {
        type: Number,
        required: [true, 'Minimum price is required']
    },
    maxPrice: {
        type: String,
        required: [true, 'Maximum price is required']
    },
    modalPrice: {
        type: Number, // Most common trading price
        required: [true, 'Modal price is required']
    },
    priceUnit: {
        type: String,
        default: 'Quintal' // or Kg, Ton
    },
    arrivalDate: {
        type: Date,
        required: [true, 'Arrival date is required']
    },
    arrivalQuantity: {
        type: Number, // Quantity arrived in market (in quintals)
        default: 0
    },
    priceTrend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable', 'volatile'],
        default: 'stable'
    },
    trendPercentage: {
        type: Number, // Percentage change from previous day
        default: 0
    },
    source: {
        type: String,
        enum: ['government', 'private', 'aggregator'],
        default: 'government'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound indexes for better query performance
marketPriceSchema.index({ cropName: 1, district: 1, arrivalDate: -1 });
marketPriceSchema.index({ state: 1, arrivalDate: -1 });
marketPriceSchema.index({ district: 1, arrivalDate: -1 });

// Virtual for price range display
marketPriceSchema.virtual('priceRange').get(function () {
    return `₹${this.minPrice} - ₹${this.maxPrice} / ${this.priceUnit}`;
});

// Static method to get latest prices by crop
marketPriceSchema.statics.getLatestPrices = async function (cropName = null, district = null, limit = 50) {
    const matchStage = { arrivalDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }; // Last 7 days

    if (cropName) matchStage.cropName = new RegExp(cropName, 'i');
    if (district) matchStage.district = new RegExp(district, 'i');

    return this.aggregate([
        { $match: matchStage },
        { $sort: { arrivalDate: -1 } },
        {
            $group: {
                _id: {
                    cropName: '$cropName',
                    marketName: '$marketName',
                    district: '$district'
                },
                latestPrice: { $first: '$$ROOT' }
            }
        },
        { $replaceRoot: { newRoot: '$latestPrice' } },
        { $limit: limit }
    ]);
};

module.exports = mongoose.model('MarketPrice', marketPriceSchema);