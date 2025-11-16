// services/farmGuidanceService.js
class FarmGuidanceService {
    
    // Analyze soil moisture and provide recommendations
    static analyzeSoilMoisture(soilMoistureData, cropType) {
        const optimalRanges = {
            'Wheat': { min: 25, max: 35 },
            'Corn': { min: 30, max: 40 },
            'Rice': { min: 40, max: 60 },
            'Cotton': { min: 25, max: 35 },
            'Soybean': { min: 30, max: 40 }
        };

        const range = optimalRanges[cropType] || { min: 25, max: 35 };
        const currentMoisture = soilMoistureData.value;

        if (currentMoisture < range.min) {
            return {
                status: 'critical',
                message: `Soil moisture too low for ${cropType}. Immediate irrigation needed.`,
                recommendation: 'Start irrigation system immediately',
                action: 'irrigate'
            };
        } else if (currentMoisture > range.max) {
            return {
                status: 'warning',
                message: `Soil moisture too high for ${cropType}. Risk of root rot.`,
                recommendation: 'Reduce irrigation and improve drainage',
                action: 'reduce_water'
            };
        } else {
            return {
                status: 'optimal',
                message: `Soil moisture is optimal for ${cropType}`,
                recommendation: 'Maintain current irrigation schedule',
                action: 'monitor'
            };
        }
    }

    // Analyze temperature conditions
    static analyzeTemperature(tempData, cropType) {
        const optimalRanges = {
            'Wheat': { min: 15, max: 25 },
            'Corn': { min: 20, max: 30 },
            'Rice': { min: 20, max: 35 },
            'Cotton': { min: 25, max: 35 },
            'Soybean': { min: 20, max: 30 }
        };

        const range = optimalRanges[cropType] || { min: 15, max: 30 };
        const currentTemp = tempData.value;

        if (currentTemp < range.min) {
            return {
                status: 'warning',
                message: `Temperature below optimal range for ${cropType}`,
                recommendation: 'Consider using crop covers or greenhouses',
                action: 'protect_from_cold'
            };
        } else if (currentTemp > range.max) {
            return {
                status: 'warning',
                message: `Temperature above optimal range for ${cropType}`,
                recommendation: 'Ensure adequate irrigation and consider shade nets',
                action: 'protect_from_heat'
            };
        } else {
            return {
                status: 'optimal',
                message: `Temperature is optimal for ${cropType}`,
                recommendation: 'Ideal growing conditions',
                action: 'monitor'
            };
        }
    }

    // Generate comprehensive farm report
    static async generateFarmReport(farmId) {
        const sensorData = await SensorData.find({ farmId })
            .sort({ timestamp: -1 })
            .limit(100);

        // Group by sensor type and get latest readings
        const latestReadings = {};
        sensorData.forEach(reading => {
            if (!latestReadings[reading.sensorType] || 
                reading.timestamp > latestReadings[reading.sensorType].timestamp) {
                latestReadings[reading.sensorType] = reading;
            }
        });

        // Get farm details
        const farm = await Farm.findById(farmId);
        const cropType = farm.crops[0]?.name || 'General';

        // Generate recommendations
        const recommendations = [];
        
        if (latestReadings.soil_moisture) {
            recommendations.push(this.analyzeSoilMoisture(latestReadings.soil_moisture, cropType));
        }
        
        if (latestReadings.temperature) {
            recommendations.push(this.analyzeTemperature(latestReadings.temperature, cropType));
        }

        // Add nutrient analysis if available
        if (latestReadings.nutrient_level) {
            const nutrientLevel = latestReadings.nutrient_level.value;
            if (nutrientLevel < 50) {
                recommendations.push({
                    status: 'warning',
                    message: 'Low nutrient levels detected',
                    recommendation: 'Apply organic fertilizer or compost',
                    action: 'fertilize'
                });
            }
        }

        return {
            farm: farm.name,
            cropType,
            latestReadings,
            recommendations,
            reportGenerated: new Date(),
            overallStatus: recommendations.some(r => r.status === 'critical') ? 'critical' : 
                          recommendations.some(r => r.status === 'warning') ? 'warning' : 'healthy'
        };
    }
}

module.exports = FarmGuidanceService;