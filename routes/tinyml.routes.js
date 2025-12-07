// routes/tinyml.routes.js - New TinyML Routes
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TinyMLController = require('../controllers/TinyMLController.js');

// Edge device registration
router.post('/devices/register', auth, TinyMLController.registerDevice);
router.get('/devices', auth, TinyMLController.getDevices);
router.get('/devices/:deviceId', auth, TinyMLController.getDeviceDetails);

// Model management
router.get('/models', TinyMLController.getAvailableModels);
router.get('/models/:modelId/download', TinyMLController.downloadModel);
router.post('/models/:modelId/deploy', auth, TinyMLController.deployModel);

// Edge inference results
router.post('/inference/soil-moisture', auth, TinyMLController.handleSoilMoistureInference);
router.post('/inference/irrigation-decision', auth, TinyMLController.handleIrrigationDecision);
router.post('/inference/anomaly', auth, TinyMLController.handleAnomalyDetection);

// Recommendations with TinyML context
router.get('/recommendations/:farmId', auth, TinyMLController.getMLRecommendations);

// Training data collection
router.post('/training-data', auth, TinyMLController.collectTrainingData);

// Device telemetry
router.post('/telemetry', auth, TinyMLController.receiveTelemetry);

module.exports = router;

