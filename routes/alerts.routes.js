const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/AlertController');
const authMiddleware = require('../middleware/auth');

router.get('/alerts/:farmId', authMiddleware, AlertController.getAlerts);
router.patch('/alerts/:alertId', authMiddleware, AlertController.resolveAlert);

module.exports = router;