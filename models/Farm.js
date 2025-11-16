const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Farm name is required'],
        trim: true,
        maxlength: [100, 'Farm name cannot be more than 100 characters']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        address: String,
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
        area: {
            type: Number,
            min: [0.1, 'Area must be at least 0.1 acres'],
            required: true
        },
        soilType: {
            type: String,
            enum: ['clay', 'sandy', 'loamy', 'silty', 'peaty', 'chalky'],
            default: 'loamy'
        }
    },
    image: {
        type: String, // URL to uploaded image
        default: null
    },
    crops: [{
        name: {
            type: String,
            required: true
        },
        variety: String,
        plantingDate: Date,
        harvestDate: Date,
        currentStage: {
            type: String,
            enum: ['planting', 'germination', 'vegetative', 'flowering', 'harvesting'],
            default: 'planting'
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better query performance
farmSchema.index({ owner: 1 });
farmSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Farm', farmSchema);