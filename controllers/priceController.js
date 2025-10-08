// controllers/priceController.js
const CropPriceService = require('../services/CropPriceService.js');

 const getCropPrice = async (req, res) => {
    try {
        const { cropName } = req.params;
        const { state = 'Karnataka' } = req.query;

            console.log(`🎯 Getting crop price for ${cropName} in ${state}`);
        if (!cropName) { 
            return res.status(400).json({
                success: false,
                message: 'Crop name is required'
            });
        }

        const priceData = await CropPriceService.getCropPrice(cropName, state);
        
        res.json({
            success: true,
            data: priceData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Price controller error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

 const getBulkPrices = async (req, res) => {
    try {
        const { crops } = req.params;
        console.log(`🎯 Getting bulk prices for: ${crops}`);
          if (!crops) {
            return res.status(400).json({
                success: false,
                message: 'Crops parameter is required. Example: /bulk/tomato,onion,potato'
            });
        }
        const cropList = crops.split(',');
        
        const prices = await Promise.all(
            cropList.map(crop => CropPriceService.getCropPrice(crop.trim()))
        );
        
        res.json({
            success: true,
            data: prices,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching bulk prices'
        });
    }
};
module.exports = {
    getCropPrice,
    getBulkPrices
};