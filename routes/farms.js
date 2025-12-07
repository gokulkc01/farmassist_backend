const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/farms/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// @desc    Register a new farm
// @route   POST /api/farms
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, soilType, area, address, lat, lng, crops } = req.body;

        // 1. Validate required fields
        if (!name || !soilType || !area || !address || !lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: name, soilType, area, address, lat, lng'
            });
        }

        // 2. Validate and parse numbers
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const parsedArea = parseFloat(area);

        if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedArea)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid number values for lat, lng, or area'
            });
        }

        // 3. Safely parse crops
        let parsedCrops = [];
        if (crops) {
            try {
                parsedCrops = typeof crops === 'string' ? JSON.parse(crops) : crops;
                // Validate it's an array
                if (!Array.isArray(parsedCrops)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Crops must be an array'
                    });
                }
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid crops format. Must be valid JSON array'
                });
            }
        }

        // 4. Create farm object with validated data
        const farmData = {
            name,
            owner: req.user.id,
            location: {
                address,
                coordinates: {
                    lat: parsedLat,
                    lng: parsedLng
                },
                area: parsedArea,
                soilType
            },
            crops: parsedCrops,
            isActive: true
        };

        // 5. Add image path if uploaded
        if (req.file) {
            farmData.image = `/uploads/farms/${req.file.filename}`;
        }

        const farm = await Farm.create(farmData);

        res.status(201).json({
            success: true,
            message: 'Farm registered successfully',
            data: farm
        });

    } catch (error) {
        console.error('Farm registration error:', error);

        // Handle specific Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error registering farm',
            error: error.message
        });
    }
});

// @desc    Get all farms for logged-in user
// @route   GET /api/farms
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const farms = await Farm.find({
            owner: req.user.id,
            isActive: true
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: farms.length,
            data: farms
        });
    } catch (error) {
        console.error('Get farms error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching farms',
            error: error.message
        });
    }
});
// @desc    Get farm by ID
// @route   GET /api/farms/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const farm = await Farm.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        res.json({
            success: true,
            data: farm
        });
    } catch (error) {
        console.error('Get farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching farm',
            error: error.message
        });
    }
});

// @desc    Update farm
// @route   PUT /api/farms/:id
// @access  Private
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, soilType, area, address, lat, lng, crops } = req.body;

        const farm = await Farm.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        // Update fields
        if (name) farm.name = name;
        if (soilType) farm.location.soilType = soilType;
        if (area) farm.location.area = parseFloat(area);
        if (address) farm.location.address = address;
        if (lat) farm.location.coordinates.lat = parseFloat(lat);
        if (lng) farm.location.coordinates.lng = parseFloat(lng);
        if (crops) {
            farm.crops = typeof crops === 'string' ? JSON.parse(crops) : crops;
        }
        if (req.file) {
            farm.image = `/uploads/farms/${req.file.filename}`;
        }

        await farm.save();

        res.json({
            success: true,
            message: 'Farm updated successfully',
            data: farm
        });

    } catch (error) {
        console.error('Update farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating farm',
            error: error.message
        });
    }
});

// @desc    Delete farm
// @route   DELETE /api/farms/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const farm = await Farm.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        // Soft delete
        farm.isActive = false;
        await farm.save();

        res.json({
            success: true,
            message: 'Farm deleted successfully'
        });

    } catch (error) {
        console.error('Delete farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting farm',
            error: error.message
        });
    }
});

module.exports = router;