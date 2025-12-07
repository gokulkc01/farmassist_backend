const Insight = require('../models/Insight');
const Alert = require('../models/Alert');
const AIAgentService = require('../services/EnhancedAIAgentService');

class InsightController {
  async receiveInsight(req, res) {
    try {
      const insightData = {
        timestamp: req.body.timestamp,
        deviceId: req.body.device_id,
        farmId: req.body.farm_id,
        soilMoisture: req.body.soil_moisture,
        moistureTrend: req.body.moisture_trend,
        predictedMoisture6h: req.body.predicted_moisture_6h,
        irrigationNeed: req.body.irrigation_need,
        temperature: req.body.temperature,
        humidity: req.body.humidity,
        ph: req.body.ph,
        ec: req.body.ec,
        lightIntensity: req.body.light_intensity,
        cropStage: req.body.crop_stage,
        anomaly: req.body.anomaly,
        moistureStats: req.body.moisture_stats
      };

      const insight = new Insight(insightData);
      await insight.save();

      if (insightData.irrigationNeed === 'HIGH') {
        const alert = new Alert({
          farmId: insightData.farmId,
          alertType: 'irrigation',
          severity: 'high',
          message: `Urgent irrigation needed. Moisture: ${insightData.soilMoisture}%`,
          data: { moisture: insightData.soilMoisture }
        });
        await alert.save();
      }

      if (insightData.anomaly) {
        const alert = new Alert({
          farmId: insightData.farmId,
          alertType: 'anomaly',
          severity: 'medium',
          message: 'Sensor anomaly detected',
          data: insightData
        });
        await alert.save();
      }

      res.json({ status: 'success', message: 'Insight stored' });
    } catch (error) {
      console.error('Error storing insight:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getInsights(req, res) {
    try {
      const { farmId } = req.params;
      const limit = parseInt(req.query.limit) || 100;

      const insights = await Insight.find({ farmId })
        .sort({ timestamp: -1 })
        .limit(limit);

      res.json({
        farmId,
        count: insights.length,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getAnalysis(req, res) {
    try {
      const { farmId } = req.params;
      const analysis = await AIAgentService.analyzeInsights(farmId);

      res.json({
        farmId,
        analysis
      });
    } catch (error) {
      console.error('Error generating analysis:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req, res) {
    try {
      const { farmId } = req.params;
      const days = parseInt(req.query.days) || 7;
      const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

      const insights = await Insight.find({
        farmId,
        timestamp: { $gte: startTime }
      }).sort({ timestamp: 1 });

      const stats = {
        totalReadings: insights.length,
        avgMoisture: insights.reduce((sum, i) => sum + i.soilMoisture, 0) / insights.length,
        avgTemperature: insights.reduce((sum, i) => sum + i.temperature, 0) / insights.length,
        avgHumidity: insights.reduce((sum, i) => sum + i.humidity, 0) / insights.length,
        irrigationNeeded: insights.filter(i => i.irrigationNeed === 'HIGH').length,
        anomalies: insights.filter(i => i.anomaly).length
      };

      res.json({ farmId, days, stats });
    } catch (error) {
      console.error('Error calculating stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new InsightController();