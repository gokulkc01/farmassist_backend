const IrrigationLog = require('../models/IrrigationLog');

class IrrigationController {
  async logIrrigation(req, res) {
    try {
      const irrigationData = {
        farmId: req.body.farm_id,
        timestamp: req.body.timestamp || Date.now(),
        duration: req.body.duration,
        waterAmount: req.body.water_amount,
        method: req.body.method,
        notes: req.body.notes
      };

      const log = new IrrigationLog(irrigationData);
      await log.save();

      res.json({ status: 'success', log });
    } catch (error) {
      console.error('Error logging irrigation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getIrrigationHistory(req, res) {
    try {
      const { farmId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const logs = await IrrigationLog.find({ farmId })
        .sort({ timestamp: -1 })
        .limit(limit);

      res.json({
        farmId,
        count: logs.length,
        logs
      });
    } catch (error) {
      console.error('Error fetching irrigation logs:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new IrrigationController();