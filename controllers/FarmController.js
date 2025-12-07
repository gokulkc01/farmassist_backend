const Farm = require('../models/Farm');

class FarmController {
  async getFarm(req, res) {
    try {
      const { farmId } = req.params;
      const farm = await Farm.findOne({ farmId });

      if (!farm) {
        return res.status(404).json({ error: 'Farm not found' });
      }

      res.json(farm);
    } catch (error) {
      console.error('Error fetching farm:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createOrUpdateFarm(req, res) {
    try {
      const farmData = {
        farmId: req.body.farm_id,
        name: req.body.name,
        location: req.body.location,
        areaHectares: req.body.area_hectares,
        cropType: req.body.crop_type,
        cropStage: req.body.crop_stage,
        soilType: req.body.soil_type,
        ownerInfo: req.body.owner_info
      };

      const farm = await Farm.findOneAndUpdate(
        { farmId: farmData.farmId },
        farmData,
        { upsert: true, new: true }
      );

      res.json({ status: 'success', farm });
    } catch (error) {
      console.error('Error creating/updating farm:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new FarmController();