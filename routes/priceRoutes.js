// routes/priceRoutes.js
const express = require('express');
const router = express.Router();
const cropPriceService = require('../services/CropPriceService');
const { getCropPrice, getBulkPrices } =  require('../controllers/priceController.js');

/**
 * GET /api/prices/:crop
 * Get current price for a crop
 * Example: GET /api/prices/Tomato?state=Karnataka
 */
router.get('/:cropName', getCropPrice);

/**
 * GET /api/prices/list/crops
 * Get list of available crops
 */
router.get('/list/crops', (req, res) => {
    const crops = cropPriceService.getAvailableCrops();
    res.json({
        success: true,
        crops: crops
    });
});

router.get('/bulk/:crops', getBulkPrices); // crops=tomato,onion,potato

module.exports = router;