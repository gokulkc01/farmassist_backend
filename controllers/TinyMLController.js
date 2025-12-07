// controllers/TinyMLController.js
// ============================================

const SensorData = require('../models/SensorData');
const Farm = require('../models/Farm');
const EdgeDevice = require('../models/EdgeDevice'); // New model
const MLInference = require('../models/MLInference'); // New model

class TinyMLController {
    
    // Register a new edge device (ESP32)
    static async registerDevice(req, res) {
        try {
            const { deviceId, deviceType, firmwareVersion, capabilities, farmId } = req.body;
            
            // Verify farm ownership
            const farm = await Farm.findOne({ _id: farmId, owner: req.user.id });
            if (!farm) {
                return res.status(404).json({
                    success: false,
                    message: 'Farm not found or access denied'
                });
            }
            
            // Check if device already exists
            let device = await EdgeDevice.findOne({ deviceId });
            
            if (device) {
                // Update existing device
                device.farmId = farmId;
                device.firmwareVersion = firmwareVersion;
                device.capabilities = capabilities;
                device.lastSeen = new Date();
                device.status = 'online';
                await device.save();
            } else {
                // Create new device
                device = await EdgeDevice.create({
                    deviceId,
                    deviceType,
                    farmId,
                    owner: req.user.id,
                    firmwareVersion,
                    capabilities,
                    status: 'online',
                    lastSeen: new Date()
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Device registered successfully',
                data: device
            });
            
        } catch (error) {
            console.error('Device registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Error registering device',
                error: error.message
            });
        }
    }
    
    // Get all devices for a user
    static async getDevices(req, res) {
        try {
            const devices = await EdgeDevice.find({ owner: req.user.id })
                .populate('farmId', 'name location')
                .sort({ lastSeen: -1 });
            
            res.json({
                success: true,
                data: devices,
                count: devices.length
            });
        } catch (error) {
            console.error('Get devices error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching devices',
                error: error.message
            });
        }
    }
    
    // Get device details with inference history
    static async getDeviceDetails(req, res) {
        try {
            const { deviceId } = req.params;
            
            const device = await EdgeDevice.findOne({ 
                deviceId, 
                owner: req.user.id 
            }).populate('farmId', 'name location');
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }
            
            // Get recent inference results
            const inferences = await MLInference.find({ deviceId })
                .sort({ timestamp: -1 })
                .limit(100);
            
            res.json({
                success: true,
                data: {
                    device,
                    recentInferences: inferences,
                    stats: {
                        totalInferences: inferences.length,
                        anomaliesDetected: inferences.filter(i => i.isAnomaly).length,
                        irrigationsTriggered: inferences.filter(i => i.action === 'irrigate').length
                    }
                }
            });
            
        } catch (error) {
            console.error('Get device details error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching device details',
                error: error.message
            });
        }
    }
    
    // Get available TinyML models
    static async getAvailableModels(req, res) {
        try {
            const models = [
                {
                    id: 'anomaly_detector_v1',
                    name: 'Soil Moisture Anomaly Detector',
                    version: '1.0',
                    size: '2KB',
                    description: 'Detects sensor failures and unusual readings',
                    inputShape: [1, 5],
                    outputShape: [1, 5],
                    accuracy: 0.94,
                    downloadUrl: '/api/tinyml/models/anomaly_detector_v1/download'
                },
                {
                    id: 'irrigation_predictor_v1',
                    name: 'Irrigation Decision Predictor',
                    version: '1.0',
                    size: '4KB',
                    description: 'Makes local irrigation decisions',
                    inputShape: [1, 6],
                    outputShape: [1, 2],
                    accuracy: 0.89,
                    downloadUrl: '/api/tinyml/models/irrigation_predictor_v1/download'
                },
                {
                    id: 'water_stress_predictor_v1',
                    name: 'Water Stress Predictor',
                    version: '1.0',
                    size: '6KB',
                    description: 'Predicts soil moisture 6-24 hours ahead',
                    inputShape: [1, 24, 3],
                    outputShape: [1, 3],
                    accuracy: 0.96,
                    downloadUrl: '/api/tinyml/models/water_stress_predictor_v1/download'
                }
            ];
            
            res.json({
                success: true,
                data: models
            });
            
        } catch (error) {
            console.error('Get models error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching models'
            });
        }
    }
    
    // Download TinyML model file
    static async downloadModel(req, res) {
        try {
            const { modelId } = req.params;
            const modelPath = `./ml_models/${modelId}.tflite`;
            
            res.download(modelPath, `${modelId}.tflite`, (err) => {
                if (err) {
                    console.error('Model download error:', err);
                    res.status(404).json({
                        success: false,
                        message: 'Model file not found'
                    });
                }
            });
            
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({
                success: false,
                message: 'Error downloading model'
            });
        }
    }
    static async deployModel(req, res) {
    return res.json({ success: true, message: "Model deployed (placeholder)" });
}

    
    // Handle soil moisture inference from edge device
    static async handleSoilMoistureInference(req, res) {
        try {
            const { 
                deviceId, 
                soilMoisture, 
                temperature, 
                humidity, 
                timestamp,
                reconstructionError,
                confidence 
            } = req.body;
            
            // Store inference result
            const inference = await MLInference.create({
                deviceId,
                inferenceType: 'soil_moisture',
                inputData: { soilMoisture, temperature, humidity },
                outputData: { reconstructionError },
                confidence,
                timestamp: timestamp || new Date(),
                isAnomaly: reconstructionError > 0.1
            });
            
            // Also store as sensor reading
            const device = await EdgeDevice.findOne({ deviceId });
            if (device) {
                await SensorData.create({
                    farmId: device.farmId,
                    sensorType: 'soil_moisture',
                    value: soilMoisture,
                    unit: '%',
                    location: device.location,
                    metadata: {
                        edgeProcessed: true,
                        reconstructionError,
                        confidence,
                        deviceId
                    },
                    dataQuality: reconstructionError > 0.1 ? 'poor' : 'excellent',
                    timestamp: timestamp || new Date()
                });
            }
            
            res.json({
                success: true,
                message: 'Inference recorded',
                data: inference
            });
            
        } catch (error) {
            console.error('Soil moisture inference error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing inference',
                error: error.message
            });
        }
    }
    
    // Handle irrigation decision from edge
    static async handleIrrigationDecision(req, res) {
        try {
            const {
                deviceId,
                soilMoisture,
                temperature,
                humidity,
                hoursSinceRain,
                irrigationNeeded,
                recommendedDuration,
                confidence,
                timestamp
            } = req.body;
            
            // Store inference
            const inference = await MLInference.create({
                deviceId,
                inferenceType: 'irrigation_decision',
                inputData: { soilMoisture, temperature, humidity, hoursSinceRain },
                outputData: { irrigationNeeded, recommendedDuration },
                confidence,
                action: irrigationNeeded ? 'irrigate' : 'hold',
                timestamp: timestamp || new Date()
            });
            
            // If irrigation was triggered, log the event
            if (irrigationNeeded) {
                const device = await EdgeDevice.findOne({ deviceId });
                if (device) {
                    // You can integrate with your existing motor control here
                    console.log(`✅ Edge device ${deviceId} triggered irrigation: ${recommendedDuration} minutes`);
                }
            }
            
            res.json({
                success: true,
                message: 'Irrigation decision recorded',
                data: inference
            });
            
        } catch (error) {
            console.error('Irrigation decision error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing irrigation decision',
                error: error.message
            });
        }
    }
    
    // Handle anomaly detection
    static async handleAnomalyDetection(req, res) {
        try {
            const { deviceId, anomalyType, severity, details, timestamp } = req.body;
            
            const inference = await MLInference.create({
                deviceId,
                inferenceType: 'anomaly_detection',
                inputData: details,
                outputData: { anomalyType, severity },
                isAnomaly: true,
                timestamp: timestamp || new Date()
            });
            
            // Send notification if severity is high
            if (severity === 'high') {
                // TODO: Integrate with notification service
                console.log(`🚨 HIGH SEVERITY ANOMALY: ${anomalyType} on device ${deviceId}`);
            }
            
            res.json({
                success: true,
                message: 'Anomaly recorded',
                data: inference
            });
            
        } catch (error) {
            console.error('Anomaly detection error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing anomaly',
                error: error.message
            });
        }
    }
    
    // Get ML-enhanced recommendations
    static async getMLRecommendations(req, res) {
        try {
            const { farmId } = req.params;
            
            // Verify farm ownership
            const farm = await Farm.findOne({ _id: farmId, owner: req.user.id });
            if (!farm) {
                return res.status(404).json({
                    success: false,
                    message: 'Farm not found'
                });
            }
            
            // Get recent edge inferences
            const devices = await EdgeDevice.find({ farmId });
            const deviceIds = devices.map(d => d.deviceId);
            
            const recentInferences = await MLInference.find({
                deviceId: { $in: deviceIds },
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).sort({ timestamp: -1 });
            
            // Generate recommendations based on edge intelligence
            const recommendations = [];
            
            // Check for anomalies
            const anomalies = recentInferences.filter(i => i.isAnomaly);
            if (anomalies.length > 0) {
                recommendations.push({
                    type: 'alert',
                    priority: 'high',
                    title: 'Sensor Anomalies Detected',
                    message: `${anomalies.length} anomalous readings detected in the last 24 hours`,
                    action: 'Check sensor calibration',
                    source: 'tinyml_edge'
                });
            }
            
            // Check irrigation decisions
            const irrigationDecisions = recentInferences.filter(
                i => i.inferenceType === 'irrigation_decision' && i.action === 'irrigate'
            );
            if (irrigationDecisions.length > 0) {
                const totalDuration = irrigationDecisions.reduce(
                    (sum, i) => sum + (i.outputData.recommendedDuration || 0), 
                    0
                );
                recommendations.push({
                    type: 'irrigation',
                    priority: 'medium',
                    title: 'Edge Devices Managed Irrigation',
                    message: `${irrigationDecisions.length} irrigation events automatically handled by edge devices`,
                    details: `Total water delivered: ${totalDuration} minutes`,
                    source: 'tinyml_edge'
                });
            }
            
            res.json({
                success: true,
                data: {
                    recommendations,
                    edgeInferences: {
                        total: recentInferences.length,
                        anomalies: anomalies.length,
                        irrigations: irrigationDecisions.length
                    },
                    devices: devices.map(d => ({
                        deviceId: d.deviceId,
                        status: d.status,
                        lastSeen: d.lastSeen
                    }))
                }
            });
            
        } catch (error) {
            console.error('Get ML recommendations error:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating recommendations',
                error: error.message
            });
        }
    }
    
    // Collect training data from edge devices
    static async collectTrainingData(req, res) {
        try {
            const { deviceId, dataType, samples } = req.body;
            
            // Store training samples for later model retraining
            // In production, you'd send this to a data lake or ML pipeline
            
            console.log(`📊 Collected ${samples.length} training samples from ${deviceId}`);
            
            res.json({
                success: true,
                message: 'Training data collected',
                samplesReceived: samples.length
            });
            
        } catch (error) {
            console.error('Training data collection error:', error);
            res.status(500).json({
                success: false,
                message: 'Error collecting training data'
            });
        }
    }
    
    // Receive device telemetry
    static async receiveTelemetry(req, res) {
        try {
            const { deviceId, batteryLevel, signalStrength, memoryUsage, uptime } = req.body;
            
            // Update device status
            await EdgeDevice.findOneAndUpdate(
                { deviceId },
                {
                    lastSeen: new Date(),
                    status: 'online',
                    'telemetry.batteryLevel': batteryLevel,
                    'telemetry.signalStrength': signalStrength,
                    'telemetry.memoryUsage': memoryUsage,
                    'telemetry.uptime': uptime
                }
            );
            
            res.json({
                success: true,
                message: 'Telemetry received'
            });
            
        } catch (error) {
            console.error('Telemetry error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing telemetry'
            });
        }
    }
}

module.exports = TinyMLController;