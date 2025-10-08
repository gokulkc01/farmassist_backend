const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('../routes/auth.routes');
const cookieParser = require('cookie-parser');
const priceRoutes = require('../routes/priceRoutes')
app.use(cors());
app.use(express.json());

app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/prices', priceRoutes);



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


module.exports = app;
