// demo-data.js - Populate database with realistic test data
// Updated to match your actual database models

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Insight = require('./models/Insight');
const SensorData = require('./models/SensorData');
const IrrigationLog = require('./models/IrrigationLog');
const Farm = require('./models/Farm');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/farmassist';

// You'll need to replace this with an actual User ID from your database
// Run this query first: db.users.findOne()
const DEMO_USER_ID = '68e79c2b5b27e1b3d0e1fcbc'; // Replace with actual user ID

// Will be populated after creating farm
let DEMO_FARM_ID = null;
const DEMO_DEVICE_ID = 'ESP32_DHT22_001';

/**
 * Create a demo farm
 */
async function createDemoFarm() {
  try {
    // Check if demo farm already exists
    const existingFarm = await Farm.findOne({ name: 'Demo Smart Farm' });
    
    if (existingFarm) {
      console.log('✅ Demo farm already exists:', existingFarm._id);
      return existingFarm._id.toString();
    }

    // Create new farm
    const farm = await Farm.create({
      name: 'Demo Smart Farm',
      owner: DEMO_USER_ID,
      location: {
        address: 'Bangalore Rural, Karnataka, India',
        coordinates: {
          lat: 12.9716,
          lng: 77.5946
        },
        area: 5.5, // acres
        soilType: 'loamy'
      },
      image: null,
      crops: [
        {
          name: 'Tomato',
          variety: 'Hybrid',
          plantingDate: new Date(Date.now() - 45 * 24 * 3600 * 1000), // 45 days ago
          harvestDate: new Date(Date.now() + 45 * 24 * 3600 * 1000), // 45 days from now
          currentStage: 'vegetative'
        },
        {
          name: 'Chilli',
          variety: 'G4',
          plantingDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
          harvestDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          currentStage: 'flowering'
        }
      ],
      isActive: true
    });

    console.log('✅ Created demo farm:', farm._id);
    return farm._id.toString();

  } catch (error) {
    console.error('❌ Error creating farm:', error.message);
    
    // If owner validation fails, suggest creating a user first
    if (error.message.includes('owner')) {
      console.log('\n💡 You need to create a user first!');
      console.log('   Run this in MongoDB shell or Compass:');
      console.log(`
      db.users.insertOne({
        name: "Demo User",
        email: "demo@farm.com",
        password: "hashed_password_here",
        createdAt: new Date()
      })
      `);
      console.log('\n   Then copy the _id and update DEMO_USER_ID in this script.');
    }
    
    throw error;
  }
}

/**
 * Generate realistic sensor reading for Insights collection
 */
function generateInsightData(baseTime, hoursAgo, farmId, cropStage = 'vegetative') {
  const timestamp = Math.floor((baseTime - (hoursAgo * 3600 * 1000)) / 1000);
  const date = new Date(timestamp * 1000);
  const hourOfDay = date.getHours();
  
  // Simulate daily temperature cycle (cooler at night, warmer during day)
  const tempVariation = 5 * Math.sin((hourOfDay - 6) * Math.PI / 12);
  
  // Simulate moisture depletion over time (0.5% per hour without irrigation)
  const moistureDepletion = hoursAgo * 0.5;
  
  // Base values
  let soilMoisture = 45 - moistureDepletion + (Math.random() * 4 - 2);
  soilMoisture = Math.max(10, Math.min(70, soilMoisture)); // Clamp 10-70%
  
  const temperature = 28 + tempVariation + (Math.random() * 2 - 1);
  const humidity = 65 + (Math.random() * 10 - 5);
  const ph = 6.5 + (Math.random() * 0.4 - 0.2);
  const ec = 1.2 + (Math.random() * 0.3 - 0.15);
  const lightIntensity = hourOfDay >= 6 && hourOfDay <= 18 
    ? 30000 + (Math.random() * 10000) 
    : 0;

  // Calculate trends
  let moistureTrend = 'stable';
  if (soilMoisture < 25) moistureTrend = 'declining';
  else if (soilMoisture < 20) moistureTrend = 'declining_rapidly';
  else if (soilMoisture > 50) moistureTrend = 'stable';
  
  const predictedMoisture6h = Math.max(10, soilMoisture - 3);
  
  // Determine irrigation need
  let irrigationNeed = 'LOW';
  if (soilMoisture < 20) irrigationNeed = 'HIGH';
  else if (soilMoisture < 30) irrigationNeed = 'MEDIUM';

  return {
    timestamp,
    deviceId: DEMO_DEVICE_ID,
    farmId: farmId, // Now using string farmId as per your schema
    soilMoisture: parseFloat(soilMoisture.toFixed(2)),
    moistureTrend,
    predictedMoisture6h: parseFloat(predictedMoisture6h.toFixed(2)),
    irrigationNeed,
    temperature: parseFloat(temperature.toFixed(2)),
    humidity: parseFloat(humidity.toFixed(2)),
    ph: parseFloat(ph.toFixed(2)),
    ec: parseFloat(ec.toFixed(2)),
    lightIntensity: Math.round(lightIntensity),
    cropStage,
    anomaly: Math.random() < 0.05, // 5% chance of anomaly
    moistureStats: {
      mean: parseFloat(soilMoisture.toFixed(2)),
      std: 2.5,
      min: parseFloat((soilMoisture - 5).toFixed(2)),
      max: parseFloat((soilMoisture + 5).toFixed(2)),
      trend: soilMoisture < 35 ? -0.5 : 0.1
    }
  };
}

/**
 * Generate sensor data entry for SensorData collection
 */
function generateSensorData(baseTime, hoursAgo, farmId, sensorType) {
  const timestamp = new Date(baseTime - (hoursAgo * 3600 * 1000));
  const hourOfDay = timestamp.getHours();
  
  let value, dataQuality;
  
  switch(sensorType) {
    case 'temperature':
      const tempVariation = 5 * Math.sin((hourOfDay - 6) * Math.PI / 12);
      value = 28 + tempVariation + (Math.random() * 2 - 1);
      dataQuality = value >= 10 && value <= 35 ? 'excellent' : 'good';
      break;
    
    case 'humidity':
      value = 65 + (Math.random() * 10 - 5);
      dataQuality = value >= 40 && value <= 70 ? 'excellent' : 'good';
      break;
    
    case 'soil_moisture':
      const moistureDepletion = hoursAgo * 0.5;
      value = 45 - moistureDepletion + (Math.random() * 4 - 2);
      value = Math.max(10, Math.min(70, value));
      dataQuality = value >= 30 && value <= 60 ? 'excellent' : value >= 20 ? 'good' : 'poor';
      break;
    
    case 'ph_level':
      value = 6.5 + (Math.random() * 0.4 - 0.2);
      dataQuality = value >= 6.0 && value <= 7.5 ? 'excellent' : 'good';
      break;
    
    default:
      value = 50;
      dataQuality = 'good';
  }

  return {
    farmId: new mongoose.Types.ObjectId(farmId), // Convert to ObjectId for SensorData
    sensorType,
    sensorModel: sensorType === 'temperature' || sensorType === 'humidity' ? 'DHT22' : 'YL-69',
    sensorId: `${sensorType}_${Math.random().toString(36).substr(2, 9)}`,
    value: parseFloat(value.toFixed(2)),
    location: {
      name: 'Main Field - Zone A',
      coordinates: {
        lat: 12.9716 + (Math.random() * 0.01 - 0.005),
        lng: 77.5946 + (Math.random() * 0.01 - 0.005)
      },
      zone: 'north'
    },
    dataQuality,
    status: 'active',
    metadata: {
      batteryLevel: 80 + Math.random() * 20,
      signalStrength: 70 + Math.random() * 30,
      readingAttempts: 1,
      calibrationOffset: 0,
      lastMaintenance: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      nextMaintenance: new Date(Date.now() + 60 * 24 * 3600 * 1000)
    },
    weatherConditions: {
      weather: hourOfDay >= 6 && hourOfDay <= 18 ? 'sunny' : 'unknown',
      rainfallLast24h: 0,
      windSpeed: 5 + Math.random() * 10
    },
    timestamp,
    recordedAt: timestamp
  };
}

/**
 * Generate irrigation log entry
 */
function generateIrrigationLog(baseTime, daysAgo, farmId) {
  const timestamp = Math.floor((baseTime - (daysAgo * 24 * 3600 * 1000)) / 1000);
  const duration = 30 + Math.random() * 60; // 30-90 minutes
  const waterAmount = duration * 100; // 100L per minute

  return {
    farmId: farmId, // String as per your schema
    timestamp,
    duration: Math.round(duration),
    waterAmount: Math.round(waterAmount),
    method: ['drip', 'sprinkler', 'flood'][Math.floor(Math.random() * 3)],
    notes: `Routine irrigation - soil moisture was at ${(30 + Math.random() * 10).toFixed(1)}%`
  };
}

/**
 * Main function to populate database
 */
async function populateDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create demo farm
    console.log('\n🏞️ Creating demo farm...');
    DEMO_FARM_ID = await createDemoFarm();

    const baseTime = Date.now();

    // Clear existing demo data
    console.log('\n🗑️  Clearing existing demo data...');
    await Insight.deleteMany({ farmId: DEMO_FARM_ID });
    await SensorData.deleteMany({ farmId: new mongoose.Types.ObjectId(DEMO_FARM_ID) });
    await IrrigationLog.deleteMany({ farmId: DEMO_FARM_ID });
    console.log('✅ Cleared old data');

    // Generate Insights (last 168 hours = 7 days, hourly readings)
    console.log('\n📊 Generating insights...');
    const insights = [];
    for (let i = 0; i < 168; i++) {
      insights.push(generateInsightData(baseTime, i, DEMO_FARM_ID, 'vegetative'));
    }
    await Insight.insertMany(insights);
    console.log(`✅ Created ${insights.length} insight records`);

    // Generate Sensor Data (multiple sensors, last 7 days)
    console.log('\n📡 Generating sensor data...');
    const sensorTypes = ['temperature', 'humidity', 'soil_moisture', 'ph_level'];
    const sensorData = [];
    
    for (let sensorType of sensorTypes) {
      for (let i = 0; i < 168; i++) { // Hourly for 7 days
        sensorData.push(generateSensorData(baseTime, i, DEMO_FARM_ID, sensorType));
      }
    }
    await SensorData.insertMany(sensorData);
    console.log(`✅ Created ${sensorData.length} sensor data records`);

    // Generate Irrigation Logs (last 30 days, every 3-5 days)
    console.log('\n💧 Generating irrigation logs...');
    const irrigationLogs = [];
    let dayCounter = 0;
    while (dayCounter < 30) {
      irrigationLogs.push(generateIrrigationLog(baseTime, dayCounter, DEMO_FARM_ID));
      dayCounter += 3 + Math.floor(Math.random() * 3); // Every 3-5 days
    }
    await IrrigationLog.insertMany(irrigationLogs);
    console.log(`✅ Created ${irrigationLogs.length} irrigation log records`);

    // Add critical scenarios
    console.log('\n⚠️  Adding critical scenarios...');
    
    // Critical low moisture (2 hours ago)
    const criticalScenario = generateInsightData(baseTime, 2, DEMO_FARM_ID, 'vegetative');
    criticalScenario.soilMoisture = 14.5;
    criticalScenario.irrigationNeed = 'HIGH';
    criticalScenario.moistureTrend = 'declining_rapidly';
    criticalScenario.predictedMoisture6h = 11.2;
    criticalScenario.temperature = 36.5;
    await Insight.create(criticalScenario);
    console.log('✅ Added critical low moisture scenario');

    // Anomaly scenario (5 hours ago)
    const anomalyScenario = generateInsightData(baseTime, 5, DEMO_FARM_ID, 'vegetative');
    anomalyScenario.anomaly = true;
    anomalyScenario.ph = 8.5; // Unusual pH
    await Insight.create(anomalyScenario);
    console.log('✅ Added anomaly scenario');

    // High temperature scenario (1 hour ago)
    const heatScenario = generateInsightData(baseTime, 1, DEMO_FARM_ID, 'flowering');
    heatScenario.temperature = 38.5;
    heatScenario.soilMoisture = 22.3;
    heatScenario.irrigationNeed = 'MEDIUM';
    await Insight.create(heatScenario);
    console.log('✅ Added high temperature scenario');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Demo data population completed successfully!');
    console.log('='.repeat(60));
    
    console.log('\n📋 Summary:');
    console.log(`   • Farm ID: ${DEMO_FARM_ID}`);
    console.log(`   • Device ID: ${DEMO_DEVICE_ID}`);
    console.log(`   • Insights: ${insights.length + 3} records (7 days hourly + 3 scenarios)`);
    console.log(`   • Sensor Data: ${sensorData.length} records (4 sensors × 168 hours)`);
    console.log(`   • Irrigation Logs: ${irrigationLogs.length} records (30 days)`);
    
    console.log('\n💡 Test the chatbot with these queries:');
    console.log('   📱 English:');
    console.log('      - "What is my current soil moisture?"');
    console.log('      - "Should I irrigate today?"');
    console.log('      - "Show me farm health status"');
    console.log('      - "What\'s the temperature?"');
    
    console.log('\n   📱 Kannada (ಕನ್ನಡ):');
    console.log('      - "ನನ್ನ ಹೊಲದ ಸ್ಥಿತಿ ಹೇಗಿದೆ?"');
    console.log('      - "ಇಂದು ನೀರು ಹಾಕಬೇಕೇ?"');
    console.log('      - "ಮಣ್ಣಿನ ತೇವಾಂಶ ಎಷ್ಟಿದೆ?"');
    
    console.log('\n📡 API Test Commands:');
    console.log(`
    # Test chat endpoint
    curl -X POST http://localhost:5000/api/chat \\
      -H "Content-Type: application/json" \\
      -d '{
        "farm_id": "${DEMO_FARM_ID}",
        "message": "What is my soil moisture?",
        "language": "en"
      }'
    
    # Get insights
    curl http://localhost:5000/api/insights/${DEMO_FARM_ID}?limit=10
    
    # Get analysis
    curl http://localhost:5000/api/analysis/${DEMO_FARM_ID}
    `);

    console.log('\n🔑 Important Notes:');
    console.log(`   • Save this Farm ID: ${DEMO_FARM_ID}`);
    console.log('   • Use this ID in your frontend farm selector');
    console.log('   • Data covers last 7 days with realistic variations');
    console.log('   • Includes critical scenarios for testing alerts');

  } catch (error) {
    console.error('\n❌ Error populating database:', error);
    console.error('\nError details:', error.message);
    
    if (error.message.includes('owner')) {
      console.log('\n💡 Fix: Create a user first!');
      console.log('   1. Open MongoDB Compass or mongo shell');
      console.log('   2. Run: db.users.insertOne({ name: "Demo User", email: "demo@farm.com", createdAt: new Date() })');
      console.log('   3. Copy the _id from the result');
      console.log('   4. Update DEMO_USER_ID at the top of this script');
      console.log('   5. Run this script again: node demo-data.js');
    }
    
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB\n');
  }
}

// Run the script
if (require.main === module) {
  populateDatabase();
}

module.exports = { populateDatabase };