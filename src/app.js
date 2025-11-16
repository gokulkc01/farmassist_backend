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

console.log('backend started');


module.exports = app;
