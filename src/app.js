const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('../routes/auth.routes');
const cookieParser = require('cookie-parser');
const priceRoutes = require('../routes/priceRoutes');
const plantHealth  = require('../routes/plantHealth.routes');
const farmRoutes = require('../routes/farms');
const SensorData = require('../routes/SensorData');
const guidance = require('../routes/guidance');
const tinymlRoutes = require('../routes/tinyml.routes.js');
const insightsRoutes = require('../routes/insights.routes');
const chatRoutes = require('../routes/chat.routes');
const alertsRoutes = require('../routes/alerts.routes');
const irrigationRoutes = require('../routes/irrigation.routes');
app.use(cors());
app.use(express.json());

app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/plant',plantHealth);
app.use('/api/farms', farmRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/sensor-data', SensorData);
app.use('/api/guidance', guidance);
app.use('/api/tinyml', tinymlRoutes);
//New Smart Farm routes
app.use('/api',insightsRoutes);
app.use('/api', chatRoutes);
app.use('/api', alertsRoutes);
app.use('/api', irrigationRoutes);

//Raspberry PI IP address 
const PI_IP = 'http://10.20.17.69:5000';

app.post('/api/led', async (req, res) => {
    const { action } = req.body; //'on' or 'off'
    console.log(`LED command received: ${action}`);
    
    try {
    // Forward request to Raspberry Pi using native fetch
    const response = await fetch(`${PI_IP}/led`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const data = await response.json();
    
    console.log('✅ Pi response:', data);
    res.json({ 
      success: true, 
      message: `LED turned ${action}`,
      piResponse: data 
    });
    
  } catch (error) {
    console.error('❌ Error communicating with Pi:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to control LED',
      details: error.message 
    });
  }
   
});

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ✅ ADD: Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'FarmAssist API is running',
        timestamp: new Date().toISOString()
    });
});

// ✅ ADD: Root route
app.get('/', (req, res) => {
    res.json({
        message: 'FarmAssist API Server',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            prices: '/api/prices/:cropName',
            bulkPrices: '/api/prices/bulk/:crops',
            availableCrops: '/api/prices/list/crops'
        }
    });
});
app.get('/smartroutes', (req, res) => {
  res.json({
    service: 'Smart Farm API',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'tinyml',
      'prices', 
      'auth',
      'plant-health',
      'farms',
      'sensor-data',
      'guidance',
      'insights',
      'chat',
      'alerts',
      'irrigation'
    ]
  });
});

console.log('backend started');


module.exports = app;
