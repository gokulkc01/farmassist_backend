const Alert = require('../models/Alert');

class AlertController {
  async getAlerts(req, res) {
    try {
      const { farmId } = req.params;
      const resolved = req.query.resolved === 'true';

      const alerts = await Alert.find({ farmId, resolved })
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        farmId,
        count: alerts.length,
        alerts
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const alert = await Alert.findByIdAndUpdate(
        alertId,
        { resolved: true },
        { new: true }
      );

      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ status: 'success', alert });
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AlertController();