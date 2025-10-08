const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['farmer'],
        default: 'farmer'
    },
    location: {
        state: String,
        district: String,
        village: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        default : ['0.0', '0.0']
    },
    language: {
        type: String,
        enum: ['en', 'hi', 'te', 'kn'],
        default: 'en'
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('User', userSchema);