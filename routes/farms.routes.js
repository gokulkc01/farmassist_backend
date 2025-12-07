const express = require('express');
const router = express.Router();
const FarmController = require('../controllers/FarmController');
const authMiddleware = require('../middleware/auth');

router.get('/farm/:farmId', authMiddleware, FarmController.getFarm);
router.post('/farm', authMiddleware, FarmController.createOrUpdateFarm);

module.exports = router;