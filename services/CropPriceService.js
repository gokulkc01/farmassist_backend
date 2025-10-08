// services/cropPriceService.js
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 24 hours (86400 seconds)
const priceCache = new NodeCache({ stdTTL: 86400 });

class CropPriceService {
    constructor() {
        this.apiKey = process.env.DATA_GOV_IN_API_KEY || 'DEMO_KEY';
        this.baseUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
        
        if (this.apiKey === 'DEMO_KEY') {
            console.log('⚠️ Using demo mode - Add DATA_GOV_IN_API_KEY for real data');
        }
    }
    
    /**
     * Get current prices for a crop
     */
    async getCropPrice(cropName, state = 'Karnataka') {
        console.log(`🔍 Fetching price for ${cropName} in ${state}...`);
        
        // Check cache first
        const cacheKey = `${cropName}_${state}`.toLowerCase();
        const cached = priceCache.get(cacheKey);
        
        if (cached) {
            console.log('✅ Returning cached data');
            return cached;
        }

        // Use fallback if no real API key
        if (this.apiKey === 'DEMO_KEY') {
            return this.getFallbackPrice(cropName);
        }
        
        try {
            // Call government API
            const response = await axios.get(this.baseUrl, {
                params: {
                    'api-key': this.apiKey,
                    'format': 'json',
                    'filters[commodity]': cropName,
                    'filters[state]': state,
                    'limit': 50
                },
                timeout: 10000
            });
            
            // Check if we got data
            if (!response.data || !response.data.records || response.data.records.length === 0) {
                console.log('⚠️ No data found for', cropName);
                return this.getFallbackPrice(cropName);
            }
            
            // Process the data
            const priceData = this.processData(response.data.records);
            
            // Cache it
            priceCache.set(cacheKey, priceData);
            
            console.log(`✅ Fetched ${priceData.markets.length} markets for ${cropName}`);
            
            return priceData;
            
        } catch (error) {
            console.error('❌ API Error:', {
                message: error.message,
                crop: cropName,
                state: state
            });
            
            // Return fallback data
            return this.getFallbackPrice(cropName);
        }
    }
    
    /**
     * Process raw API data
     */
    processData(records) {
        if (!records || !Array.isArray(records)) {
            console.error('Invalid records data');
            return this.getFallbackPrice('Unknown');
        }

        if (!records[0]) {
            console.error('No records found in data');
            return this.getFallbackPrice('Unknown');
        }

        // Extract and clean data
        const markets = records.map(record => ({
            market: record.market || 'Unknown Market',
            district: record.district || 'Unknown District',
            minPrice: parseInt(record.min_price) || 0,
            maxPrice: parseInt(record.max_price) || 0,
            modalPrice: parseInt(record.modal_price) || 0,
            date: record.arrival_date || new Date().toLocaleDateString(),
            quality: record.grade || 'Standard'
        }));
        
        // Calculate state average
        const validPrices = markets.filter(m => m.modalPrice > 0);
        const avgPrice = validPrices.length > 0
            ? Math.round(validPrices.reduce((sum, m) => sum + m.modalPrice, 0) / validPrices.length)
            : 0;
        
        // Find price range
        const allPrices = validPrices.map(m => m.modalPrice);
        const minStatePrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
        const maxStatePrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
        
        return {
            commodity: records[0].commodity,
            state: records[0].state,
            stateAverage: avgPrice,
            priceRange: {
                min: minStatePrice,
                max: maxStatePrice
            },
            unit: 'Rs/Quintal',
            lastUpdated: records[0].arrival_date,
            totalMarkets: markets.length,
            markets: markets.slice(0, 10), // Return top 10 markets
            dataSource: 'AGMARKNET - Government of India',
            isFallback: false
        };
    }
    
    /**
     * Fallback prices when API fails
     */
    getFallbackPrice(cropName) {
        const fallbackData = {
            'tomato': { avg: 2000, min: 1500, max: 2500, unit: 'Quintal' },
            'onion': { avg: 1800, min: 1200, max: 2400, unit: 'Quintal' },
            'potato': { avg: 1500, min: 1000, max: 2000, unit: 'Quintal' },
            'cabbage': { avg: 1200, min: 800, max: 1600, unit: 'Quintal' },
            'chili': { avg: 5000, min: 4000, max: 6000, unit: 'Quintal' },
            'brinjal': { avg: 2500, min: 2000, max: 3000, unit: 'Quintal' },
        };
        
        const cropKey = cropName.toLowerCase();
        // ✅ FIXED: Use cropKey instead of cropName
        const data = fallbackData[cropKey] || { avg: 1500, min: 1000, max: 2000, unit: 'Quintal' };

        // Create realistic mock markets
        const mockMarkets = [
            { market: 'Bangalore APMC', district: 'Bangalore', modalPrice: data.avg + 200, minPrice: data.min, maxPrice: data.max },
            { market: 'Kolar Market', district: 'Kolar', modalPrice: data.avg, minPrice: data.min - 100, maxPrice: data.max - 100 },
            { market: 'Tumkur Market', district: 'Tumkur', modalPrice: data.avg - 100, minPrice: data.min - 200, maxPrice: data.max - 200 }
        ];
        
        return {
            commodity: cropName,
            state: 'Karnataka',
            stateAverage: data.avg,
            priceRange: { min: data.min, max: data.max },
            unit: `Rs/${data.unit}`,
            lastUpdated: new Date().toISOString().split('T')[0],
            totalMarkets: mockMarkets.length,
            markets: mockMarkets,
            dataSource: 'Estimated Data (API Unavailable)',
            isFallback: true
        };
    }
    
    /**
     * Get available commodities
     */
    getAvailableCrops() {
        return [
            'Tomato', 'Onion', 'Potato', 'Cabbage', 'Chili',
            'Brinjal', 'Carrot', 'Cauliflower', 'Cucumber',
            'Beans', 'Lady Finger', 'Capsicum'
        ];
    }
    /**
 * Get prices for multiple crops at once
 */
async getBulkPrices(cropNames, state = 'Karnataka') {
    try {
        const pricePromises = cropNames.map(crop => 
            this.getCropPrice(crop, state)
        );
        
        const results = await Promise.allSettled(pricePromises);
        
        return results.map((result, index) => ({
            crop: cropNames[index],
            data: result.status === 'fulfilled' ? result.value : this.getFallbackPrice(cropNames[index]),
            status: result.status
        }));
        
    } catch (error) {
        console.error('Bulk price fetch error:', error);
        return cropNames.map(crop => ({
            crop,
            data: this.getFallbackPrice(crop),
            status: 'error'
        }));
    }
}

    // Add cache statistics and management
    getCacheStats() {
        return {
            keys: priceCache.keys(),
            stats: priceCache.getStats()
        };
    }

    // Clear cache for specific crop
    clearCropCache(cropName, state = 'Karnataka') {
        const cacheKey = `${cropName}_${state}`.toLowerCase();
        return priceCache.del(cacheKey);
    }

    // Clear all cache
    clearAllCache() {
        priceCache.flushAll();
        console.log('✅ All price cache cleared');
    }
}

module.exports = new CropPriceService();