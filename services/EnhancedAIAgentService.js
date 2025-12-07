const Insight = require('../models/Insight');
const SensorData = require('../models/SensorData');
const IrrigationLog = require('../models/IrrigationLog');
const ChatHistory = require('../models/ChatHistory');
const Farm = require('../models/Farm');

class EnhancedAIAgentService {
  constructor() {
    this.conversationContext = new Map();
    console.log('✅ EnhancedAIAgentService initialized (using Gemini API)');
  }

  /**
   * Main chat response with Gemini AI integration
   */
  async chatResponse(farmId, message, language = 'en') {
    console.log('📩 chatResponse called with:', { farmId, message, language });

    try {
      // Step 1: Gather farm context (including crop info)
      console.log('Step 1: Gathering farm context...');
      let farmContext;
      try {
        farmContext = await this.gatherFarmContext(farmId);
        console.log('✅ Farm context gathered:', JSON.stringify(farmContext?.currentConditions || 'null'));
        console.log('✅ Crop info:', JSON.stringify(farmContext?.cropInfo || 'null'));
      } catch (contextError) {
        console.error('❌ Error gathering farm context:', contextError.message);
        farmContext = this.getEmptyContext(farmId);
      }

      // Step 2: Check for Gemini API key
      const apiKey = process.env.GEMINI_API_KEY;
      console.log('Step 2: Checking Gemini API key...', apiKey ? 'Key exists' : 'No key found');

      // Step 3: Try Gemini API if key exists
      if (apiKey && apiKey.startsWith('AIza')) {
        try {
          console.log('Step 3: Calling Gemini API...');
          const conversationHistory = await this.getConversationHistory(farmId, 5);
          const prompt = this.buildGeminiPrompt(message, farmContext, conversationHistory, language);

          const response = await this.callGeminiAPI(prompt);

          await this.saveConversation(farmId, message, response, farmContext);
          console.log('✅ Gemini API response received');
          return response;
        } catch (apiError) {
          console.error('❌ Gemini API failed:', apiError.message);
        }
      }

      // Step 4: Use smart fallback
      console.log('Step 4: Using smart fallback response...');
      const fallbackResponse = this.getSmartFallbackResponse(message, farmContext, language);

      await this.saveConversation(farmId, message, fallbackResponse, farmContext);
      return fallbackResponse;

    } catch (error) {
      console.error('❌ chatResponse error:', error.message);
      return this.getErrorResponse(language);
    }
  }

  /**
   * Gather comprehensive farm context INCLUDING crop info
   */
  async gatherFarmContext(farmId) {
    console.log('  Querying database for farmId:', farmId);

    // Fetch farm details (crop, soil, etc.)
    let farmDetails = null;
    try {
      farmDetails = await Farm.findById(farmId);
      console.log('  Farm details found:', farmDetails?.name || 'No farm');
    } catch (err) {
      console.log('  Farm query error:', err.message);
    }

    const [insights, sensorData, irrigationLogs] = await Promise.all([
      Insight.find({ farmId }).sort({ timestamp: -1 }).limit(100).catch(err => {
        console.log('  Insight query error:', err.message);
        return [];
      }),
      SensorData.find({ farmId }).sort({ timestamp: -1 }).limit(50).catch(err => {
        console.log('  SensorData query error:', err.message);
        return [];
      }),
      IrrigationLog.find({ farmId }).sort({ timestamp: -1 }).limit(20).catch(err => {
        console.log('  IrrigationLog query error:', err.message);
        return [];
      })
    ]);

    console.log(`  Found: ${insights.length} insights, ${sensorData.length} sensor readings, ${irrigationLogs.length} irrigation logs`);

    const latest = insights[0] || {};

    let analysis;
    try {
      analysis = await this.analyzeInsights(farmId, farmDetails);
    } catch (err) {
      console.log('  Analysis error:', err.message);
      analysis = { healthScore: 0, irrigationRecommendation: 'Unable to analyze', fertilizerRecommendation: 'Unable to analyze', riskAssessment: {} };
    }

    // Extract crops array - Farm model has crops as an array
    const crops = farmDetails?.crops || [];
    const primaryCrop = crops.length > 0 ? crops[0] : null;

    // Get all crop names for context
    const allCropNames = crops.map(c => c.name).filter(Boolean);

    // Calculate days since planting for primary crop
    let daysSincePlanting = null;
    if (primaryCrop?.plantingDate) {
      const plantDate = new Date(primaryCrop.plantingDate);
      const today = new Date();
      daysSincePlanting = Math.floor((today - plantDate) / (1000 * 60 * 60 * 24));
    }

    // Get soil type from location.soilType (as per Farm model)
    const soilType = farmDetails?.location?.soilType || 'Unknown';

    // Get optimal moisture based on soil type
    const soilMoistureRanges = {
      'clay': { min: 45, max: 65 },
      'sandy': { min: 25, max: 45 },
      'loamy': { min: 40, max: 60 },
      'silty': { min: 40, max: 60 },
      'peaty': { min: 50, max: 70 },
      'chalky': { min: 35, max: 55 }
    };
    const moistureRange = soilMoistureRanges[soilType] || { min: 40, max: 60 };

    // Get latest sensor readings from SensorData collection
    const latestSensorData = {};
    if (sensorData.length > 0) {
      // Group by sensor type and get latest reading
      const sensorTypes = ['temperature', 'humidity', 'soil_moisture', 'ph_level', 'light_intensity', 'rainfall'];
      sensorTypes.forEach(type => {
        const reading = sensorData.find(s => s.sensorType === type);
        if (reading) {
          latestSensorData[type] = reading.value;
        }
      });
    }

    return {
      farmId,
      farmName: farmDetails?.name || 'Unknown Farm',
      farmLocation: farmDetails?.location?.address || 'Not specified',
      farmArea: farmDetails?.location?.area || null,

      // FIXED: Crop information from crops array
      cropInfo: {
        name: primaryCrop?.name || null,
        variety: primaryCrop?.variety || null,
        stage: primaryCrop?.currentStage || latest.cropStage || 'Unknown',
        plantingDate: primaryCrop?.plantingDate || null,
        harvestDate: primaryCrop?.harvestDate || null,
        daysSincePlanting: daysSincePlanting,
        allCrops: allCropNames // All crops being grown
      },

      // FIXED: Soil information from location.soilType
      soilInfo: {
        type: soilType,
        optimalMoistureMin: moistureRange.min,
        optimalMoistureMax: moistureRange.max,
        characteristics: this.getSoilCharacteristics(soilType)
      },

      irrigationType: farmDetails?.irrigationType || 'Manual',
      farmSize: farmDetails?.location?.area || null,
      sizeUnit: 'acres',

      // Current conditions from both Insight and SensorData
      currentConditions: {
        soilMoisture: latestSensorData.soil_moisture ?? latest.soilMoisture ?? null,
        temperature: latestSensorData.temperature ?? latest.temperature ?? null,
        humidity: latestSensorData.humidity ?? latest.humidity ?? null,
        ph: latestSensorData.ph_level ?? latest.ph ?? null,
        ec: latest.ec ?? null,
        lightIntensity: latestSensorData.light_intensity ?? latest.lightIntensity ?? null,
        rainfall: latestSensorData.rainfall ?? null,
        cropStage: primaryCrop?.currentStage || latest.cropStage || 'Unknown',
        timestamp: latest.timestamp ?? null
      },

      trends: {
        moisture: this._calculateTrend(insights.map(i => i.soilMoisture).filter(Boolean)),
        temperature: this._calculateTrend(insights.map(i => i.temperature).filter(Boolean)),
        humidity: this._calculateTrend(insights.map(i => i.humidity).filter(Boolean))
      },
      analysis,
      historicalData: {
        insights: insights.slice(0, 20),
        sensorReadings: sensorData.slice(0, 10),
        recentIrrigation: irrigationLogs.slice(0, 5)
      },
      statistics: this.calculateStatistics(insights),
      alerts: this.generateAlerts(latest, analysis, farmDetails)
    };
  }

  /**
   * Get soil characteristics for better recommendations
   */
  getSoilCharacteristics(soilType) {
    const characteristics = {
      'clay': 'Heavy soil, retains water well but drains slowly. Risk of waterlogging. Good for rice, wheat.',
      'sandy': 'Light soil, drains quickly, needs frequent irrigation. Good for root vegetables, groundnut.',
      'loamy': 'Ideal balanced soil, good drainage and water retention. Suitable for most crops.',
      'silty': 'Fertile soil, retains moisture well. Good for vegetables and fruits.',
      'peaty': 'Acidic, rich in organic matter. Needs liming. Good for root crops.',
      'chalky': 'Alkaline soil, free-draining. May need iron supplements. Good for brassicas.'
    };
    return characteristics[soilType] || 'General purpose soil';
  }

  /**
   * Build prompt for Gemini API - NOW INCLUDES FULL FARM CONTEXT
   */
  buildGeminiPrompt(message, farmContext, conversationHistory, language) {
    const languageInstructions = {
      'en': 'Respond in English.',
      'kn': 'Respond in Kannada (ಕನ್ನಡ). Use native Kannada agricultural terms.',
      'hi': 'Respond in Hindi (हिंदी). Use common agricultural Hindi terminology.',
      'ta': 'Respond in Tamil (தமிழ்). Use traditional Tamil farming terms.'
    };

    const current = farmContext.currentConditions || {};
    const analysis = farmContext.analysis || {};
    const stats = farmContext.statistics || {};
    const cropInfo = farmContext.cropInfo || {};
    const soilInfo = farmContext.soilInfo || {};

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\nRECENT CONVERSATION:\n' +
        conversationHistory.slice(-6).map(msg =>
          `${msg.role === 'user' ? 'Farmer' : 'Assistant'}: ${msg.content}`
        ).join('\n') + '\n';
    }

    // Crop-specific knowledge base
    const cropKnowledge = this.getCropKnowledge(cropInfo.name);

    // Format all crops being grown
    const allCropsText = cropInfo.allCrops && cropInfo.allCrops.length > 0
      ? cropInfo.allCrops.join(', ')
      : 'No crops registered';

    // Calculate moisture status
    let moistureStatus = 'Unknown';
    if (current.soilMoisture !== null && soilInfo.optimalMoistureMin && soilInfo.optimalMoistureMax) {
      if (current.soilMoisture < soilInfo.optimalMoistureMin) {
        moistureStatus = `LOW (${current.soilMoisture.toFixed(1)}% - below optimal ${soilInfo.optimalMoistureMin}%)`;
      } else if (current.soilMoisture > soilInfo.optimalMoistureMax) {
        moistureStatus = `HIGH (${current.soilMoisture.toFixed(1)}% - above optimal ${soilInfo.optimalMoistureMax}%)`;
      } else {
        moistureStatus = `OPTIMAL (${current.soilMoisture.toFixed(1)}%)`;
      }
    }

    return `You are an expert agricultural AI assistant and farmer companion for a smart farming system. Your role is to provide personalized, actionable advice based on the farmer's actual farm data. ${languageInstructions[language] || languageInstructions['en']}

═══════════════════════════════════════════
🏡 FARM PROFILE
═══════════════════════════════════════════
• Farm Name: ${farmContext.farmName || 'Unknown'}
• Location: ${farmContext.farmLocation || 'Not specified'}
• Farm Size: ${farmContext.farmSize ? `${farmContext.farmSize} acres` : 'Not specified'}
• Irrigation System: ${farmContext.irrigationType || 'Manual'}

═══════════════════════════════════════════
🌱 CROP INFORMATION
═══════════════════════════════════════════
• Primary Crop: ${cropInfo.name || 'NOT SET - Ask farmer what they are growing'}
• All Crops: ${allCropsText}
• Variety: ${cropInfo.variety || 'Not specified'}
• Growth Stage: ${cropInfo.stage || 'Unknown'}
• Days Since Planting: ${cropInfo.daysSincePlanting !== null ? cropInfo.daysSincePlanting + ' days' : 'Not recorded'}
• Planting Date: ${cropInfo.plantingDate ? new Date(cropInfo.plantingDate).toLocaleDateString() : 'Not recorded'}
• Expected Harvest: ${cropInfo.harvestDate ? new Date(cropInfo.harvestDate).toLocaleDateString() : 'Not set'}

═══════════════════════════════════════════
🪨 SOIL INFORMATION
═══════════════════════════════════════════
• Soil Type: ${soilInfo.type || 'Unknown'}
• Soil Characteristics: ${soilInfo.characteristics || 'Not available'}
• Optimal Moisture Range: ${soilInfo.optimalMoistureMin}% - ${soilInfo.optimalMoistureMax}%

═══════════════════════════════════════════
📊 REAL-TIME SENSOR DATA
═══════════════════════════════════════════
• Soil Moisture: ${current.soilMoisture !== null ? current.soilMoisture.toFixed(1) + '%' : 'No sensor data'} → Status: ${moistureStatus}
• Temperature: ${current.temperature !== null ? current.temperature.toFixed(1) + '°C' : 'No sensor data'}
• Air Humidity: ${current.humidity !== null ? current.humidity.toFixed(1) + '%' : 'No sensor data'}
• Soil pH: ${current.ph !== null ? current.ph.toFixed(2) : 'No sensor data'}
• Light Intensity: ${current.lightIntensity !== null ? current.lightIntensity + ' lux' : 'No sensor data'}
• Rainfall: ${current.rainfall !== null ? current.rainfall + ' mm' : 'No sensor data'}
• Last Reading: ${current.timestamp ? new Date(current.timestamp * 1000).toLocaleString() : 'No recent data'}

═══════════════════════════════════════════
📈 TRENDS & ANALYSIS
═══════════════════════════════════════════
• Moisture Trend: ${farmContext.trends?.moisture || 'Not enough data'}
• Temperature Trend: ${farmContext.trends?.temperature || 'Not enough data'}
• Farm Health Score: ${analysis.healthScore || 'N/A'}/100
• Irrigation Status: ${analysis.irrigationRecommendation || 'N/A'}
• Fertilizer Advice: ${analysis.fertilizerRecommendation || 'N/A'}

═══════════════════════════════════════════
📉 STATISTICS (Recent Readings)
═══════════════════════════════════════════
• Avg Moisture: ${stats.avgMoisture?.toFixed(1) || 'N/A'}%
• Avg Temperature: ${stats.avgTemperature?.toFixed(1) || 'N/A'}°C
• Total Readings: ${stats.readingsCount || 0}

${cropKnowledge ? `═══════════════════════════════════════════
📚 ${cropInfo.name?.toUpperCase()} CROP GUIDE
═══════════════════════════════════════════
${cropKnowledge}
` : ''}
${conversationContext}
═══════════════════════════════════════════
💬 FARMER'S QUESTION
═══════════════════════════════════════════
"${message}"

═══════════════════════════════════════════
📋 RESPONSE GUIDELINES
═══════════════════════════════════════════
1. If NO CROP is registered, first ask the farmer what crop they are growing
2. ALWAYS reference the actual sensor data values when giving advice
3. Consider the SOIL TYPE (${soilInfo.type}) when recommending irrigation/fertilizer
4. Tailor advice to the CURRENT GROWTH STAGE (${cropInfo.stage || 'unknown'})
5. Warn if sensor readings are outside optimal range for the crop
6. Be specific with quantities, timing, and durations
7. Use bullet points and bold for key recommendations
8. If moisture is ${current.soilMoisture !== null && current.soilMoisture < soilInfo.optimalMoistureMin ? 'LOW - recommend irrigation' : current.soilMoisture !== null && current.soilMoisture > soilInfo.optimalMoistureMax ? 'HIGH - warn about overwatering' : 'in optimal range'}
9. Keep response concise but actionable
10. Format the response in a well structured manner.

Respond now as a helpful farmer companion:`;
  }

  /**
   * Get crop-specific knowledge
   */
  getCropKnowledge(cropName) {
    if (!cropName) return null;

    const cropDatabase = {
      'rice': `
- Optimal Temperature: 20-35°C
- Water Needs: High (standing water 5-10cm during vegetative stage)
- Optimal pH: 5.5-7.0
- Growth Stages: Seedling (0-20 days), Tillering (20-45 days), Panicle (45-65 days), Flowering (65-85 days), Grain filling (85-120 days)
- Key Pests: Stem borer, Brown planthopper, Leaf folder
- Fertilizer: Apply Nitrogen in 3 splits (basal, tillering, panicle)`,

      'wheat': `
- Optimal Temperature: 15-25°C (sensitive to heat above 30°C)
- Water Needs: Moderate (critical at crown root initiation, tillering, flowering)
- Optimal pH: 6.0-7.5
- Growth Stages: Germination, Tillering, Jointing, Heading, Grain filling
- Key Pests: Aphids, Rust, Powdery mildew
- Fertilizer: NPK at sowing, Nitrogen top dress at tillering`,

      'tomato': `
- Optimal Temperature: 20-30°C (fruit set issues above 35°C)
- Water Needs: Moderate-High (consistent moisture, avoid fluctuation)
- Optimal pH: 6.0-6.8
- Growth Stages: Seedling, Vegetative, Flowering, Fruiting
- Key Pests: Tomato hornworm, Whitefly, Early/Late blight
- Fertilizer: High phosphorus at transplant, balanced NPK during fruiting`,

      'cotton': `
- Optimal Temperature: 25-35°C
- Water Needs: Moderate (critical during flowering and boll development)
- Optimal pH: 6.0-7.5
- Growth Stages: Seedling, Squaring, Flowering, Boll development
- Key Pests: Bollworm, Aphids, Whitefly
- Fertilizer: Heavy nitrogen feeder, apply in splits`,

      'sugarcane': `
- Optimal Temperature: 25-38°C
- Water Needs: High (2000-2500mm annually)
- Optimal pH: 6.0-7.5
- Growth Stages: Germination, Tillering, Grand growth, Maturity
- Key Pests: Top borer, Early shoot borer
- Fertilizer: Heavy nitrogen and potassium requirement`,

      'maize': `
- Optimal Temperature: 18-27°C
- Water Needs: Moderate (critical at tasseling and silking)
- Optimal pH: 5.8-7.0
- Growth Stages: Emergence, V-stages, Tasseling, Silking, Grain fill
- Key Pests: Fall armyworm, Corn borer
- Fertilizer: High nitrogen requirement, apply in splits`,

      'potato': `
- Optimal Temperature: 15-20°C (tuber formation)
- Water Needs: Moderate-High (consistent, avoid waterlogging)
- Optimal pH: 5.0-6.5
- Growth Stages: Sprouting, Vegetative, Tuber initiation, Tuber bulking
- Key Pests: Late blight, Colorado beetle, Aphids
- Fertilizer: High potassium for tuber quality`,

      'onion': `
- Optimal Temperature: 13-24°C
- Water Needs: Moderate (reduce before harvest)
- Optimal pH: 6.0-7.0
- Growth Stages: Seedling, Vegetative, Bulb initiation, Bulb development
- Key Pests: Thrips, Purple blotch, Downy mildew
- Fertilizer: Nitrogen for leaf growth, potassium for bulb`,

      'chilli': `
- Optimal Temperature: 20-30°C
- Water Needs: Moderate (avoid waterlogging)
- Optimal pH: 6.0-7.0
- Growth Stages: Seedling, Vegetative, Flowering, Fruiting
- Key Pests: Thrips, Mites, Fruit borer, Leaf curl virus
- Fertilizer: Balanced NPK, calcium for fruit quality`,

      'groundnut': `
- Optimal Temperature: 25-30°C
- Water Needs: Moderate (critical at pegging and pod development)
- Optimal pH: 6.0-6.5
- Growth Stages: Emergence, Flowering, Pegging, Pod development
- Key Pests: Leaf miner, Aphids, Collar rot
- Fertilizer: Low nitrogen (legume), calcium important for pods`
    };

    const normalizedCrop = cropName.toLowerCase().trim();

    // Check for exact match or partial match
    for (const [crop, knowledge] of Object.entries(cropDatabase)) {
      if (normalizedCrop.includes(crop) || crop.includes(normalizedCrop)) {
        return knowledge;
      }
    }

    return null;
  }

  /**
   * Call Gemini API
   */
  async callGeminiAPI(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    console.log('  Calling Gemini API...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response:', JSON.stringify(data));
      throw new Error('Invalid response format from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Get empty context when database query fails
   */
  getEmptyContext(farmId) {
    return {
      farmId,
      farmName: 'Unknown Farm',
      farmLocation: 'Not specified',
      farmArea: null,
      cropInfo: {
        name: null,
        variety: null,
        stage: 'Unknown',
        plantingDate: null,
        harvestDate: null,
        daysSincePlanting: null,
        allCrops: []
      },
      soilInfo: {
        type: 'Unknown',
        optimalMoistureMin: 40,
        optimalMoistureMax: 60,
        characteristics: 'Unknown soil type'
      },
      irrigationType: 'Manual',
      farmSize: null,
      sizeUnit: 'acres',
      currentConditions: {
        soilMoisture: null,
        temperature: null,
        humidity: null,
        ph: null,
        ec: null,
        lightIntensity: null,
        rainfall: null,
        cropStage: 'Unknown',
        timestamp: null
      },
      trends: { moisture: 'unknown', temperature: 'unknown', humidity: 'unknown' },
      analysis: { healthScore: 0, irrigationRecommendation: 'No data', fertilizerRecommendation: 'No data', riskAssessment: {} },
      historicalData: { insights: [], sensorReadings: [], recentIrrigation: [] },
      statistics: {},
      alerts: []
    };
  }

  /**
   * Smart fallback response - NOW CROP AWARE
   */
  getSmartFallbackResponse(message, farmContext, language) {
    const current = farmContext?.currentConditions || {};
    const analysis = farmContext?.analysis || {};
    const cropInfo = farmContext?.cropInfo || {};
    const messageLower = message.toLowerCase();

    console.log('  Smart fallback - analyzing message:', messageLower);

    const hasData = current.soilMoisture !== null && current.soilMoisture !== undefined;
    const hasCrop = cropInfo.name !== null && cropInfo.name !== undefined;

    // ===== CROP QUESTIONS =====
    if (messageLower.includes('crop') || messageLower.includes('plant') || messageLower.includes('grow')) {
      if (!hasCrop) {
        return this.formatResponse({
          title: '🌱 Crop Information Not Set',
          reason: 'I don\'t have information about what crop is being grown on your farm.',
          action: 'Please update your farm settings with the crop information, or tell me what crop you\'re growing.',
          data: { 'Farm': farmContext.farmName || farmContext.farmId },
          tips: [
            'Go to Farm Settings to add your crop details',
            'Include crop name, planting date, and growth stage',
            'This helps me give you crop-specific advice'
          ]
        });
      }

      return this.formatResponse({
        title: `🌱 Your Crop: ${cropInfo.name}`,
        reason: `You are growing ${cropInfo.name}${cropInfo.variety ? ` (${cropInfo.variety})` : ''} currently in ${cropInfo.stage} stage.`,
        action: this.getCropStageAdvice(cropInfo.name, cropInfo.stage),
        data: {
          'Crop': cropInfo.name,
          'Variety': cropInfo.variety || 'Not specified',
          'Stage': cropInfo.stage,
          'Days Since Planting': cropInfo.daysSincePlanting !== null ? `${cropInfo.daysSincePlanting} days` : 'Not specified'
        }
      });
    }

    // ===== IRRIGATION QUESTIONS =====
    if (messageLower.includes('irrigat') || messageLower.includes('water') || messageLower.includes('moisture')) {
      if (!hasData) {
        return this.formatResponse({
          title: '⚠️ No Sensor Data Available',
          reason: 'I cannot find recent sensor readings for your farm.',
          action: 'Please check if your sensors are connected and transmitting data.',
          data: { 'Farm ID': farmContext.farmId }
        });
      }

      const moisture = current.soilMoisture;
      const temp = current.temperature;
      const soilInfo = farmContext.soilInfo || {};

      let title, reason, action;
      const optMin = soilInfo.optimalMoistureMin || 40;
      const optMax = soilInfo.optimalMoistureMax || 60;

      if (moisture < 20) {
        title = '🚨 URGENT: Immediate Irrigation Required!';
        reason = `Soil moisture is critically low at ${moisture.toFixed(1)}%.${hasCrop ? ` Your ${cropInfo.name} is at risk of water stress.` : ''}`;
        action = 'Irrigate immediately for 30-45 minutes.';
      } else if (moisture < optMin) {
        title = '💧 Yes, Irrigation Recommended';
        reason = `Soil moisture (${moisture.toFixed(1)}%) is below optimal range (${optMin}-${optMax}%).${hasCrop ? ` ${cropInfo.name} in ${cropInfo.stage} stage needs adequate water.` : ''}`;
        action = 'Plan irrigation within the next 4-6 hours.';
      } else if (moisture > optMax) {
        title = '✋ No Irrigation Needed - Soil is Wet';
        reason = `Soil moisture (${moisture.toFixed(1)}%) is above optimal.${hasCrop ? ` Risk of root issues for ${cropInfo.name}.` : ''}`;
        action = 'Skip irrigation for 24-48 hours.';
      } else {
        title = '✅ Soil Moisture is Optimal';
        reason = `Current moisture at ${moisture.toFixed(1)}% is within ideal range (${optMin}-${optMax}%).`;
        action = 'No immediate irrigation needed.';
      }

      return this.formatResponse({
        title, reason, action,
        data: {
          'Soil Moisture': `${moisture.toFixed(1)}%`,
          'Optimal Range': `${optMin}-${optMax}%`,
          'Temperature': temp !== null ? `${temp.toFixed(1)}°C` : 'N/A',
          'Crop': hasCrop ? cropInfo.name : 'Not specified',
          'Trend': farmContext.trends?.moisture || 'Unknown'
        }
      });
    }

    // ===== HEALTH/STATUS QUESTIONS =====
    if (messageLower.includes('health') || messageLower.includes('status') || messageLower.includes('condition') || messageLower.includes('how')) {
      const healthScore = analysis.healthScore || 0;
      let title = healthScore >= 80 ? `🌟 Excellent Farm Health: ${healthScore}/100` :
        healthScore >= 60 ? `👍 Good Farm Health: ${healthScore}/100` :
          healthScore >= 40 ? `⚠️ Fair Farm Health: ${healthScore}/100` :
            `🚨 Poor Farm Health: ${healthScore}/100`;

      return this.formatResponse({
        title,
        reason: this.getHealthExplanation(healthScore, current, cropInfo),
        action: analysis.irrigationRecommendation || 'Continue monitoring.',
        data: {
          'Health Score': `${healthScore}/100`,
          'Crop': hasCrop ? `${cropInfo.name} (${cropInfo.stage})` : 'Not specified',
          'Soil Moisture': current.soilMoisture !== null ? `${current.soilMoisture.toFixed(1)}%` : 'No data',
          'Temperature': current.temperature !== null ? `${current.temperature.toFixed(1)}°C` : 'No data',
          'Humidity': current.humidity !== null ? `${current.humidity.toFixed(1)}%` : 'No data'
        }
      });
    }

    // ===== FERTILIZER QUESTIONS =====
    if (messageLower.includes('fertiliz') || messageLower.includes('nutrient') || messageLower.includes('npk')) {
      const fertAdvice = hasCrop ?
        this.getCropFertilizerAdvice(cropInfo.name, cropInfo.stage, current.ec) :
        'Please specify your crop for detailed fertilizer recommendations.';

      return this.formatResponse({
        title: '🧪 Fertilizer Recommendation',
        reason: hasCrop ? `Based on ${cropInfo.name} in ${cropInfo.stage} stage` : 'Crop not specified',
        action: fertAdvice,
        data: {
          'Crop': hasCrop ? cropInfo.name : 'Not specified',
          'Stage': cropInfo.stage || 'Unknown',
          'EC Level': current.ec !== null ? `${current.ec} mS/cm` : 'N/A',
          'pH Level': current.ph !== null ? `${current.ph.toFixed(2)}` : 'N/A'
        }
      });
    }

    // ===== DEFAULT: FARM SUMMARY =====
    return this.formatResponse({
      title: '📊 Your Farm Summary',
      reason: hasCrop ? `Growing ${cropInfo.name} (${cropInfo.stage} stage)` : 'Crop not specified - add crop details for better advice.',
      action: analysis.irrigationRecommendation || 'Continue monitoring.',
      data: {
        'Farm': farmContext.farmName || 'Unknown',
        'Crop': hasCrop ? `${cropInfo.name}${cropInfo.variety ? ` (${cropInfo.variety})` : ''}` : 'Not specified',
        'Stage': cropInfo.stage || 'Unknown',
        'Health Score': `${analysis.healthScore || 'N/A'}/100`,
        'Soil Moisture': current.soilMoisture !== null ? `${current.soilMoisture.toFixed(1)}%` : 'No data',
        'Temperature': current.temperature !== null ? `${current.temperature.toFixed(1)}°C` : 'No data'
      },
      tips: hasCrop ? [
        `Ask "Should I irrigate my ${cropInfo.name}?" for watering advice`,
        `Ask "What fertilizer for ${cropInfo.name}?" for nutrient recommendations`
      ] : [
        'Add your crop details in Farm Settings for personalized advice',
        'Ask "Should I irrigate today?" for watering advice'
      ]
    });
  }

  /**
   * Get crop-specific stage advice
   */
  getCropStageAdvice(cropName, stage) {
    const stageAdvice = {
      'Seedling': 'Focus on consistent moisture and protection from pests. Avoid overwatering.',
      'Vegetative': 'Ensure adequate nitrogen for leaf growth. Maintain optimal moisture.',
      'Flowering': 'Critical stage - maintain consistent water. Avoid stress. Consider phosphorus.',
      'Fruiting': 'Increase potassium for fruit quality. Maintain steady irrigation.',
      'Harvesting': 'Reduce irrigation. Monitor for maturity indicators.',
      'Unknown': 'Update growth stage in settings for specific recommendations.'
    };
    return stageAdvice[stage] || stageAdvice['Unknown'];
  }

  /**
   * Get crop-specific fertilizer advice
   */
  getCropFertilizerAdvice(cropName, stage, ec) {
    const crop = cropName?.toLowerCase() || '';

    if (stage === 'Vegetative') {
      if (crop.includes('rice') || crop.includes('wheat') || crop.includes('maize')) {
        return 'Apply nitrogen-rich fertilizer (Urea 50kg/acre). Split application recommended.';
      }
      return 'Apply balanced NPK (20:20:20) or nitrogen-rich fertilizer for leaf growth.';
    }
    if (stage === 'Flowering') {
      return 'Reduce nitrogen, increase phosphorus. Apply DAP or NPK 10:26:26.';
    }
    if (stage === 'Fruiting') {
      return 'Apply potassium-rich fertilizer (MOP) for fruit quality and size.';
    }
    return 'Apply balanced NPK based on soil test. Avoid over-fertilization.';
  }

  /**
   * Health explanation with crop context
   */
  getHealthExplanation(score, conditions, cropInfo) {
    const issues = [];
    if (conditions.soilMoisture !== null) {
      if (conditions.soilMoisture < 25) issues.push('low soil moisture');
      else if (conditions.soilMoisture > 65) issues.push('high soil moisture');
    }
    if (conditions.temperature !== null) {
      if (conditions.temperature > 35) issues.push('high temperature');
      else if (conditions.temperature < 15) issues.push('low temperature');
    }

    const cropNote = cropInfo?.name ? ` for ${cropInfo.name}` : '';

    if (score >= 80) return `Excellent conditions${cropNote}! All parameters optimal.`;
    if (score >= 60) return `Good conditions${cropNote}.${issues.length ? ` Minor concerns: ${issues.join(', ')}.` : ''}`;
    if (score >= 40) return `Some stress factors${cropNote}: ${issues.join(', ')}.`;
    return `Multiple issues${cropNote}: ${issues.join(', ')}. Immediate action needed.`;
  }

  // ===== EXISTING HELPER METHODS (unchanged) =====

  formatResponse({ title, reason, action, data, tips }) {
    let response = `**${title}**\n\n`;
    response += `📝 ${reason}\n\n`;
    response += `✅ **Recommended Action:** ${action}\n\n`;

    if (data && Object.keys(data).length > 0) {
      response += `📈 **Current Readings:**\n`;
      Object.entries(data).forEach(([key, value]) => {
        response += `• ${key}: ${value}\n`;
      });
    }

    if (tips && tips.length > 0) {
      response += `\n💡 **Tips:**\n`;
      tips.forEach(tip => { response += `• ${tip}\n`; });
    }

    return response;
  }

  async getConversationHistory(farmId, limit = 10) {
    try {
      const history = await ChatHistory.find({ farmId }).sort({ createdAt: -1 }).limit(limit);
      return history.reverse().flatMap(h => [
        { role: 'user', content: h.message || '' },
        { role: 'assistant', content: h.response || '' }
      ]).filter(m => m.content);
    } catch (error) {
      return [];
    }
  }

  async saveConversation(farmId, message, response, context) {
    try {
      const chat = new ChatHistory({
        farmId, message, response,
        context: {
          moisture: context?.currentConditions?.soilMoisture,
          temperature: context?.currentConditions?.temperature,
          healthScore: context?.analysis?.healthScore,
          crop: context?.cropInfo?.name
        }
      });
      await chat.save();
    } catch (error) {
      console.log('  Save conversation error:', error.message);
    }
  }

  calculateStatistics(insights) {
    if (!insights || insights.length === 0) return {};
    const moistureValues = insights.map(i => i.soilMoisture).filter(v => v != null);
    const tempValues = insights.map(i => i.temperature).filter(v => v != null);
    return {
      avgMoisture: moistureValues.length > 0 ? this._average(moistureValues) : null,
      avgTemperature: tempValues.length > 0 ? this._average(tempValues) : null,
      readingsCount: insights.length
    };
  }

  generateAlerts(latest, analysis, farmDetails) {
    const alerts = [];
    if (!latest || Object.keys(latest).length === 0) return alerts;

    // Get crop info for context
    const crops = farmDetails?.crops || [];
    const primaryCrop = crops.length > 0 ? crops[0] : null;
    const cropName = primaryCrop?.name || 'crop';
    const soilType = farmDetails?.location?.soilType || 'loamy';

    // Moisture alerts
    if (latest.soilMoisture != null) {
      if (latest.soilMoisture < 20) {
        alerts.push({
          severity: 'high',
          type: 'irrigation',
          message: `Critical moisture (${latest.soilMoisture.toFixed(1)}%)! ${cropName} needs immediate watering.`
        });
      } else if (latest.soilMoisture < 30) {
        alerts.push({
          severity: 'medium',
          type: 'irrigation',
          message: `Low moisture (${latest.soilMoisture.toFixed(1)}%). Plan irrigation soon.`
        });
      } else if (latest.soilMoisture > 70) {
        alerts.push({
          severity: 'medium',
          type: 'overwatering',
          message: `High moisture (${latest.soilMoisture.toFixed(1)}%). Risk of root rot for ${cropName}.`
        });
      }
    }

    // Temperature alerts
    if (latest.temperature != null) {
      if (latest.temperature > 38) {
        alerts.push({
          severity: 'high',
          type: 'heat',
          message: `Extreme heat (${latest.temperature.toFixed(1)}°C)! ${cropName} at risk of heat stress.`
        });
      } else if (latest.temperature < 10) {
        alerts.push({
          severity: 'high',
          type: 'cold',
          message: `Low temperature (${latest.temperature.toFixed(1)}°C). Frost risk for ${cropName}.`
        });
      }
    }

    // pH alerts
    if (latest.ph != null) {
      if (latest.ph < 5.5) {
        alerts.push({
          severity: 'medium',
          type: 'soil',
          message: `Acidic soil (pH ${latest.ph.toFixed(2)}). Consider liming.`
        });
      } else if (latest.ph > 8.0) {
        alerts.push({
          severity: 'medium',
          type: 'soil',
          message: `Alkaline soil (pH ${latest.ph.toFixed(2)}). May affect nutrient uptake.`
        });
      }
    }

    // Health score alerts
    if (analysis?.healthScore != null && analysis.healthScore < 60) {
      alerts.push({
        severity: 'medium',
        type: 'health',
        message: `Farm health below optimal (${analysis.healthScore}/100). Review conditions.`
      });
    }

    return alerts;
  }

  getErrorResponse(language) {
    return `⚠️ **Unable to Process Request**\n\nPlease try again or check your sensor connections.`;
  }

  async analyzeInsights(farmId, farmDetails) {
    const insights = await Insight.find({ farmId }).sort({ timestamp: -1 }).limit(100);
    if (!insights || insights.length === 0) {
      return { healthScore: 50, irrigationRecommendation: 'No data', fertilizerRecommendation: 'No data', riskAssessment: {} };
    }
    const recent = insights.slice(0, 50);
    return {
      healthScore: this._calculateHealthScore(recent),
      irrigationRecommendation: this._generateIrrigationAdvice(recent, farmDetails),
      fertilizerRecommendation: this._fertilizerAdvice(recent, farmDetails),
      riskAssessment: this._assessRisks(recent)
    };
  }

  _average(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  _calculateTrend(values) {
    if (!values || values.length < 2) return 'stable';
    const recentAvg = this._average(values.slice(0, 10));
    const olderAvg = this._average(values.slice(-10));
    const diff = recentAvg - olderAvg;
    if (diff < -5) return 'declining rapidly';
    if (diff < -2) return 'declining';
    if (diff > 5) return 'increasing rapidly';
    if (diff > 2) return 'increasing';
    return 'stable';
  }

  _generateIrrigationAdvice(insights, farmDetails) {
    if (!insights?.length) return 'No data';
    const { soilMoisture: m, temperature: t } = insights[0] || {};

    // Get primary crop from crops array
    const crops = farmDetails?.crops || [];
    const primaryCrop = crops.length > 0 ? crops[0] : null;
    const cropName = primaryCrop?.name || 'your crop';
    const soilType = farmDetails?.location?.soilType || 'loamy';

    if (m == null) return 'Sensor unavailable';
    if (m < 15) return `URGENT: Irrigate ${cropName} immediately! Critically low moisture for ${soilType} soil.`;
    if (m < 25 && t > 30) return `Irrigate ${cropName} within 2-4 hours due to heat stress.`;
    if (m < 25) return `Irrigate ${cropName} within 12 hours.`;
    if (m > 60) return `No irrigation needed. Moisture adequate for ${cropName}.`;
    return 'Moisture optimal - continue monitoring.';
  }

  _assessRisks(insights) {
    if (!insights?.length) return {};
    const { soilMoisture: m, temperature: t, humidity: h } = insights[0] || {};
    return {
      drought: m < 20 ? 'HIGH' : m < 30 ? 'MEDIUM' : 'LOW',
      heatStress: t > 35 ? 'HIGH' : t > 30 ? 'MEDIUM' : 'LOW',
      fungalDisease: (h > 80 && t > 20 && t < 30) ? 'HIGH' : h > 70 ? 'MEDIUM' : 'LOW'
    };
  }

  _fertilizerAdvice(insights, farmDetails) {
    if (!insights?.length) return 'No data';
    const { cropStage, ec } = insights[0] || {};

    // Get primary crop from crops array
    const crops = farmDetails?.crops || [];
    const primaryCrop = crops.length > 0 ? crops[0] : null;
    const cropName = primaryCrop?.name || 'your crop';
    const stage = primaryCrop?.currentStage || cropStage;

    if (stage === 'planting' || stage === 'germination') return `Apply starter fertilizer (DAP) for ${cropName} root development.`;
    if (stage === 'vegetative') return `Apply nitrogen fertilizer (Urea) for ${cropName} leaf growth.`;
    if (stage === 'flowering') return `Apply phosphorus-rich NPK 10:26:26 for ${cropName} flowering.`;
    if (stage === 'harvesting') return `Reduce fertilizer. ${cropName} is nearing harvest.`;
    return `Monitor ${cropName} growth stage for specific recommendations.`;
  }

  _calculateHealthScore(insights) {
    if (!insights?.length) return 50;
    const { soilMoisture: m, temperature: t, ph } = insights[0] || {};
    let score = 100;
    if (m != null) { if (m < 15 || m > 70) score -= 30; else if (m < 20 || m > 60) score -= 15; }
    if (t != null) { if (t > 38 || t < 10) score -= 20; else if (t > 35 || t < 15) score -= 10; }
    if (ph != null) { if (ph < 5.5 || ph > 8.0) score -= 15; else if (ph < 6.0 || ph > 7.5) score -= 8; }
    return Math.max(0, score);
  }
}

module.exports = new EnhancedAIAgentService();