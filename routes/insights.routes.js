const express = require('express');
const router = express.Router();
const InsightController = require('../controllers/InsightController');
const authMiddleware = require('../middleware/auth'); // Use your existing auth

router.post('/insights', authMiddleware, InsightController.receiveInsight);
router.get('/insights/:farmId', authMiddleware, InsightController.getInsights);
router.get('/analysis/:farmId', authMiddleware, InsightController.getAnalysis);
router.get('/stats/:farmId', authMiddleware, InsightController.getStats);

module.exports = router;