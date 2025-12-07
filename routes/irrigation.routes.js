const express = require('express');
const router = express.Router();
const IrrigationController = require('../controllers/IrrigationController');
const authMiddleware = require('../middleware/auth');

router.post('/irrigation', authMiddleware, IrrigationController.logIrrigation);
router.get('/irrigation/:farmId', authMiddleware, IrrigationController.getIrrigationHistory);

module.exports = router;