# FarmAssist Backend Documentation
## Complete API & Architecture Reference

---

# TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Database Models](#4-database-models)
5. [API Endpoints](#5-api-endpoints)
6. [Services](#6-services)
7. [Middleware](#7-middleware)
8. [Configuration](#8-configuration)
9. [Error Handling](#9-error-handling)
10. [Deployment](#10-deployment)

---

# 1. INTRODUCTION

## 1.1 Overview

FarmAssist Backend is a RESTful API server built with Node.js and Express.js that powers the FarmAssist smart agriculture platform. It provides comprehensive APIs for farm management, IoT sensor data processing, AI-powered farming recommendations, real-time market prices, and user authentication.

## 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Authentication** | JWT-based secure authentication with bcrypt password hashing |
| **Farm Management** | CRUD operations for farm registration and management |
| **Sensor Data** | Real-time IoT sensor data ingestion and processing |
| **AI Chatbot** | Gemini AI-powered farming assistant with multilingual support |
| **Market Prices** | Real-time crop price data from government APIs |
| **Irrigation Control** | Smart irrigation recommendations and IoT motor control |
| **Plant Health** | AI-based plant disease detection |
| **Alerts** | Automated alerts for critical farming conditions |

## 1.3 Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                   BACKEND STACK                        │
├────────────────────────────────────────────────────────┤
│  Runtime          │  Node.js v18+                      │
│  Framework        │  Express.js v5.1.0                 │
│  Database         │  MongoDB with Mongoose v8.18.2     │
│  Authentication   │  JWT (jsonwebtoken v9.0.2)         │
│  Password Hashing │  bcrypt v6.0.0                     │
│  AI Integration   │  Google Gemini API                 │
│  HTTP Client      │  Axios v1.12.2                     │
│  File Upload      │  Multer v2.0.2                     │
│  Security         │  Helmet v8.1.0, CORS               │
│  Validation       │  Joi v18.0.1                       │
│  Caching          │  node-cache v5.1.2                 │
│  Real-time        │  Socket.io v4.8.1                  │
│  Date Handling    │  Moment.js v2.30.1                 │
└────────────────────────────────────────────────────────┘
```

---

# 2. ARCHITECTURE OVERVIEW

## 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ React Web    │  │ Mobile App   │  │ IoT Devices  │           │
│  │ Application  │  │ (Future)     │  │ (Raspberry Pi)│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│                    Express.js Server                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    MIDDLEWARE                            │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │    │
│  │  │ CORS   │ │ Helmet │ │ Auth   │ │ JSON   │ │ Cookie │ │    │
│  │  │        │ │        │ │ JWT    │ │ Parser │ │ Parser │ │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ROUTE LAYER                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ /auth   │ │ /farms  │ │ /chat   │ │ /prices │ │ /sensor │    │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘    │
└───────┼───────────┼───────────┼───────────┼───────────┼─────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAYER                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │ AuthController│ │ FarmController│ │ ChatController│          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │PriceController│ │InsightControl │ │IrrigationCtrl │          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
│  ┌────────────────────┐ ┌────────────────────┐                  │
│  │ EnhancedAIAgent    │ │ CropPriceService   │                  │
│  │ Service (Gemini)   │ │ (Govt API)         │                  │
│  └────────────────────┘ └────────────────────┘                  │
│  ┌────────────────────┐                                         │
│  │ FarmGuidanceService│                                         │
│  └────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                    MongoDB                              │     │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │     │
│  │  │ Users  │ │ Farms  │ │Sensors │ │Insights│           │     │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │     │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │     │
│  │  │ Chats  │ │ Alerts │ │Irrigate│ │ Prices │           │     │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Request Flow

```
Client Request
      │
      ▼
┌─────────────┐
│   CORS      │──── Cross-Origin validation
└─────┬───────┘
      ▼
┌─────────────┐
│   Helmet    │──── Security headers
└─────┬───────┘
      ▼
┌─────────────┐
│ JSON Parser │──── Parse request body
└─────┬───────┘
      ▼
┌─────────────┐
│ Auth Middle │──── JWT token validation (protected routes)
└─────┬───────┘
      ▼
┌─────────────┐
│  Router     │──── Route to appropriate handler
└─────┬───────┘
      ▼
┌─────────────┐
│ Controller  │──── Business logic execution
└─────┬───────┘
      ▼
┌─────────────┐
│  Service    │──── External API calls, AI processing
└─────┬───────┘
      ▼
┌─────────────┐
│  Database   │──── Data persistence
└─────┬───────┘
      ▼
   Response
```

---

# 3. PROJECT STRUCTURE

```
backend/
├── server.js                    # Application entry point
├── package.json                 # Dependencies and scripts
├── .env                         # Environment variables (not in git)
│
├── src/
│   ├── app.js                   # Express application setup
│   └── db/
│       └── db.js                # MongoDB connection
│
├── config/                      # Configuration files
│   └── (config files)
│
├── controllers/                 # Request handlers
│   ├── auth.controller.js       # Authentication logic
│   ├── ChatController.js        # AI chatbot handler
│   ├── FarmController.js        # Farm CRUD operations
│   ├── priceController.js       # Market price handler
│   ├── InsightController.js     # Sensor insights handler
│   ├── IrrigationController.js  # Irrigation control
│   ├── AlertController.js       # Alert management
│   ├── PlantHealth.js           # Plant disease detection
│   └── TinyMLController.js      # Edge ML device management
│
├── middleware/                  # Express middleware
│   ├── auth.js                  # JWT authentication
│   └── validation.js            # Request validation
│
├── models/                      # MongoDB schemas (Mongoose)
│   ├── User.models.js           # User schema
│   ├── Farm.js                  # Farm schema
│   ├── SensorData.js            # Sensor readings schema
│   ├── Insight.js               # AI insights schema
│   ├── ChatHistory.js           # Chat logs schema
│   ├── Alert.js                 # Alerts schema
│   ├── IrrigationLog.js         # Irrigation history
│   ├── IrrigationEvent.js       # Irrigation events
│   ├── MarketPrice.js           # Price cache schema
│   ├── PriceAlert.js            # Price alerts schema
│   ├── EdgeDevice.js            # IoT device schema
│   └── MLInference.js           # ML predictions schema
│
├── routes/                      # API route definitions
│   ├── auth.routes.js           # /api/auth/*
│   ├── farms.js                 # /api/farms/*
│   ├── chat.routes.js           # /api/chat/*
│   ├── priceRoutes.js           # /api/prices/*
│   ├── SensorData.js            # /api/sensor-data/*
│   ├── insights.routes.js       # /api/insights/*
│   ├── irrigation.routes.js     # /api/irrigation/*
│   ├── alerts.routes.js         # /api/alerts/*
│   ├── plantHealth.routes.js    # /api/plant/*
│   ├── tinyml.routes.js         # /api/tinyml/*
│   └── guidance.js              # /api/guidance/*
│
├── services/                    # Business logic services
│   ├── EnhancedAIAgentService.js # Gemini AI chatbot
│   ├── CropPriceService.js      # Market price fetching
│   └── farmGuidanceService.js   # Farming recommendations
│
└── uploads/                     # File upload storage
    └── farms/                   # Farm images
```

---

# 4. DATABASE MODELS

## 4.1 User Model

**File:** `models/User.models.js`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | User's full name |
| `email` | String | Yes | Unique email address |
| `password` | String | Yes | Hashed password (bcrypt) |
| `phone` | String | Yes | Phone number |
| `role` | String | No | User role (default: 'farmer') |
| `location` | Object | No | User's location details |
| `language` | String | No | Preferred language (en, hi, te, kn) |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

```javascript
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/]
    },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['farmer'], default: 'farmer' },
    location: {
        state: String,
        district: String,
        village: String,
        coordinates: { lat: Number, lng: Number }
    },
    language: { type: String, enum: ['en', 'hi', 'te', 'kn'], default: 'en' }
}, { timestamps: true });
```

---

## 4.2 Farm Model

**File:** `models/Farm.js`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Farm name |
| `owner` | ObjectId | Yes | Reference to User |
| `location.address` | String | No | Farm address |
| `location.coordinates` | Object | Yes | lat/lng coordinates |
| `location.area` | Number | Yes | Farm area in acres |
| `location.soilType` | String | No | Soil type |
| `image` | String | No | Farm image URL |
| `crops` | Array | No | Array of crop objects |
| `isActive` | Boolean | No | Farm active status |

```javascript
const farmSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 100 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
        address: String,
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        },
        area: { type: Number, min: 0.1, required: true },
        soilType: {
            type: String,
            enum: ['clay', 'sandy', 'loamy', 'silty', 'peaty', 'chalky'],
            default: 'loamy'
        }
    },
    image: { type: String, default: null },
    crops: [{
        name: { type: String, required: true },
        variety: String,
        plantingDate: Date,
        harvestDate: Date,
        currentStage: {
            type: String,
            enum: ['planting', 'germination', 'vegetative', 'flowering', 'harvesting'],
            default: 'planting'
        }
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

---

## 4.3 SensorData Model

**File:** `models/SensorData.js`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `farmId` | ObjectId | Yes | Reference to Farm |
| `sensorType` | String | Yes | Type of sensor |
| `sensorModel` | String | No | Hardware model |
| `sensorId` | String | Yes | Unique sensor ID |
| `value` | Number | Yes | Sensor reading value |
| `unit` | String | Yes | Measurement unit |
| `location` | Object | No | Sensor location in farm |
| `quality` | String | No | Data quality indicator |

**Supported Sensor Types:**
- `temperature` - Temperature sensor (°C)
- `humidity` - Humidity sensor (%)
- `soil_moisture` - Soil moisture sensor (%)
- `ph_level` - pH sensor (pH)
- `light_intensity` - Light sensor (lux)
- `rainfall` - Rain gauge (mm)
- `wind_speed` - Anemometer (km/h)
- `air_pressure` - Barometer (hPa)

```javascript
const sensorDataSchema = new mongoose.Schema({
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
    sensorType: {
        type: String,
        required: true,
        enum: ['temperature', 'humidity', 'soil_moisture', 'ph_level', 
               'light_intensity', 'rainfall', 'wind_speed', 'air_pressure']
    },
    sensorModel: {
        type: String,
        enum: ['DHT11', 'DHT22', 'DS18B20', 'YL-69', 'BH1750', 'BMP180', 'Other']
    },
    value: { type: Number, required: true },
    unit: { type: String, enum: ['°C', '°F', '%', 'pH', 'lux', 'mm', 'km/h', 'hPa'] },
    location: { name: String, coordinates: { lat: Number, lng: Number } },
    quality: { type: String, enum: ['good', 'moderate', 'poor'] }
}, { timestamps: true });
```

---

## 4.4 Insight Model

**File:** `models/Insight.js`

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | Number | Unix timestamp |
| `deviceId` | String | IoT device identifier |
| `farmId` | String | Farm reference |
| `soilMoisture` | Number | Current moisture % |
| `moistureTrend` | String | Moisture trend direction |
| `predictedMoisture6h` | Number | 6-hour prediction |
| `irrigationNeed` | String | LOW/MEDIUM/HIGH |
| `temperature` | Number | Temperature °C |
| `humidity` | Number | Air humidity % |
| `ph` | Number | Soil pH level |
| `cropStage` | String | Current crop stage |
| `anomaly` | Boolean | Anomaly detected flag |

---

## 4.5 ChatHistory Model

**File:** `models/ChatHistory.js`

| Field | Type | Description |
|-------|------|-------------|
| `farmId` | String | Farm context for chat |
| `message` | String | User's message |
| `response` | String | AI response |
| `context` | Object | Additional context data |
| `createdAt` | Date | Timestamp |

```javascript
const chatHistorySchema = new mongoose.Schema({
    farmId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    response: { type: String, required: true },
    context: {
        moisture: Number,
        temperature: Number,
        healthScore: Number,
        crop: String,
        language: String,
        timestamp: Number
    }
}, { timestamps: true });
```

---

# 5. API ENDPOINTS

## 5.1 Authentication APIs

**Base URL:** `/api/auth`

### Register User
```
POST /api/auth/register
```

**Request Body:**
```json
{
    "name": "John Farmer",
    "email": "john@example.com",
    "password": "securePassword123",
    "phone": "+91-9876543210",
    "location": {
        "state": "Karnataka",
        "district": "Bangalore"
    },
    "language": "en"
}
```

**Response (201):**
```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user": {
            "_id": "64abc123def456",
            "name": "John Farmer",
            "email": "john@example.com",
            "phone": "+91-9876543210",
            "role": "farmer"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### Login User
```
POST /api/auth/login
```

**Request Body:**
```json
{
    "email": "john@example.com",
    "password": "securePassword123"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "User logged in successfully",
    "data": {
        "user": {
            "_id": "64abc123def456",
            "name": "John Farmer",
            "email": "john@example.com"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### Logout User
```
POST /api/auth/logout
```

**Response (200):**
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

---

## 5.2 Farm Management APIs

**Base URL:** `/api/farms`

### Create Farm
```
POST /api/farms
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Farm name |
| soilType | string | Yes | clay/sandy/loamy/silty/peaty/chalky |
| area | number | Yes | Area in acres |
| address | string | Yes | Farm address |
| lat | number | Yes | Latitude |
| lng | number | Yes | Longitude |
| crops | JSON string | No | Array of crop objects |
| image | file | No | Farm image (jpg/png/webp) |

**Response (201):**
```json
{
    "success": true,
    "message": "Farm registered successfully",
    "data": {
        "_id": "64farm123abc",
        "name": "Green Valley Farm",
        "owner": "64abc123def456",
        "location": {
            "address": "Village Road, Karnataka",
            "coordinates": { "lat": 12.9716, "lng": 77.5946 },
            "area": 5.5,
            "soilType": "loamy"
        },
        "crops": [
            {
                "name": "Tomato",
                "variety": "Roma",
                "currentStage": "vegetative"
            }
        ],
        "isActive": true
    }
}
```

### Get All Farms
```
GET /api/farms
Authorization: Bearer <token>
```

**Response (200):**
```json
{
    "success": true,
    "count": 2,
    "data": [
        {
            "_id": "64farm123abc",
            "name": "Green Valley Farm",
            "location": { ... },
            "crops": [ ... ]
        }
    ]
}
```

### Get Farm by ID
```
GET /api/farms/:id
Authorization: Bearer <token>
```

### Update Farm
```
PUT /api/farms/:id
Authorization: Bearer <token>
```

### Delete Farm
```
DELETE /api/farms/:id
Authorization: Bearer <token>
```

---

## 5.3 AI Chat APIs

**Base URL:** `/api/chat`

### Send Chat Message
```
POST /api/chat
Authorization: Bearer <token>
```

**Request Body:**
```json
{
    "farm_id": "64farm123abc",
    "message": "Should I irrigate my tomatoes today?",
    "language": "en"
}
```

**Supported Languages:**
- `en` - English
- `kn` - Kannada (ಕನ್ನಡ)
- `hi` - Hindi (हिंदी)
- `ta` - Tamil (தமிழ்)

**Response (200):**
```json
{
    "status": "success",
    "farm_id": "64farm123abc",
    "message": "Should I irrigate my tomatoes today?",
    "response": "**💧 Irrigation Recommendation**\n\nBased on your current sensor data:\n- Soil Moisture: 32% (LOW)\n- Temperature: 28°C\n\n✅ **Recommended Action:** Irrigate your tomatoes within 4-6 hours. The moisture level is below the optimal range (40-60%) for loamy soil.\n\n**Tips:**\n• Water in early morning or evening\n• Apply 25-30mm of water\n• Check moisture again after 2 hours",
    "language": "en",
    "timestamp": 1701936000000
}
```

### Get Chat History
```
GET /api/chat/history/:farmId
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max messages to return |

### Clear Chat History
```
DELETE /api/chat/history/:farmId
Authorization: Bearer <token>
```

### Get Conversation Stats
```
GET /api/chat/stats/:farmId
Authorization: Bearer <token>
```

---

## 5.4 Market Price APIs

**Base URL:** `/api/prices`

### Get Crop Price
```
GET /api/prices/:cropName
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| state | string | Karnataka | State for price lookup |

**Example:** `GET /api/prices/tomato?state=Karnataka`

**Response (200):**
```json
{
    "success": true,
    "data": {
        "commodity": "Tomato",
        "state": "Karnataka",
        "stateAverage": 2150,
        "priceRange": {
            "min": 1800,
            "max": 2500
        },
        "unit": "Rs/Quintal",
        "lastUpdated": "2025-12-07",
        "totalMarkets": 15,
        "markets": [
            {
                "market": "Bangalore APMC",
                "district": "Bangalore",
                "minPrice": 2000,
                "maxPrice": 2400,
                "modalPrice": 2200
            }
        ],
        "dataSource": "AGMARKNET - Government of India",
        "isFallback": false
    },
    "timestamp": "2025-12-07T10:30:00.000Z"
}
```

### Get Bulk Prices
```
GET /api/prices/bulk/:crops
```

**Example:** `GET /api/prices/bulk/tomato,onion,potato`

---

## 5.5 Sensor Data APIs

**Base URL:** `/api/sensor-data`

### Submit Sensor Reading
```
POST /api/sensor-data
Authorization: Bearer <token>
```

**Request Body:**
```json
{
    "farmId": "64farm123abc",
    "sensorType": "soil_moisture",
    "value": 45.5,
    "unit": "%",
    "location": {
        "name": "North Field",
        "coordinates": { "lat": 12.9716, "lng": 77.5946 }
    }
}
```

### Get Sensor Data
```
GET /api/sensor-data/:farmId
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sensorType | string | Filter by sensor type |
| startDate | date | Start date for range |
| endDate | date | End date for range |
| limit | number | Max records (default: 100) |

### Get Sensor Summary
```
GET /api/sensor-data/:farmId/summary
Authorization: Bearer <token>
```

---

## 5.6 Insights APIs

**Base URL:** `/api`

### Get Farm Insights
```
GET /api/insights/:farmId
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Max insights to return |

### Get Farm Analysis
```
GET /api/analysis/:farmId
Authorization: Bearer <token>
```

**Response:**
```json
{
    "analysis": {
        "healthScore": 78,
        "irrigationRecommendation": "Irrigate within 6 hours",
        "fertilizerRecommendation": "Apply nitrogen fertilizer",
        "riskAssessment": {
            "drought": "MEDIUM",
            "heatStress": "LOW",
            "fungalDisease": "LOW"
        }
    }
}
```

---

## 5.7 Irrigation APIs

**Base URL:** `/api/irrigation`

### Get Irrigation Status
```
GET /api/irrigation/:farmId
Authorization: Bearer <token>
```

### Get Irrigation Logs
```
GET /api/irrigation/:farmId/logs
Authorization: Bearer <token>
```

---

## 5.8 Alert APIs

**Base URL:** `/api/alerts`

### Get Farm Alerts
```
GET /api/alerts/:farmId
Authorization: Bearer <token>
```

**Response:**
```json
{
    "success": true,
    "alerts": [
        {
            "_id": "64alert123",
            "severity": "high",
            "type": "irrigation",
            "message": "Critical moisture (18.5%)! Tomato needs immediate watering.",
            "createdAt": "2025-12-07T08:00:00.000Z",
            "acknowledged": false
        }
    ]
}
```

---

## 5.9 IoT Control APIs

### LED/Motor Control
```
POST /api/led
```

**Request Body:**
```json
{
    "action": "on"
}
```

**Response:**
```json
{
    "success": true,
    "message": "LED turned on",
    "piResponse": { "status": "ok" }
}
```

---

# 6. SERVICES

## 6.1 EnhancedAIAgentService

**File:** `services/EnhancedAIAgentService.js`

The core AI service that powers the farming assistant chatbot using Google Gemini API.

### Key Methods:

#### `chatResponse(farmId, message, language)`
Main entry point for chat interactions.

```javascript
async chatResponse(farmId, message, language = 'en') {
    // 1. Gather farm context (crops, soil, sensors)
    // 2. Build context-aware prompt
    // 3. Call Gemini API
    // 4. Save conversation history
    // 5. Return response
}
```

#### `gatherFarmContext(farmId)`
Collects comprehensive farm data for AI context.

**Returns:**
```javascript
{
    farmId,
    farmName: "Green Valley Farm",
    cropInfo: {
        name: "Tomato",
        variety: "Roma",
        stage: "flowering",
        daysSincePlanting: 45,
        allCrops: ["Tomato", "Chilli"]
    },
    soilInfo: {
        type: "loamy",
        optimalMoistureMin: 40,
        optimalMoistureMax: 60,
        characteristics: "Ideal balanced soil..."
    },
    currentConditions: {
        soilMoisture: 35.5,
        temperature: 28.0,
        humidity: 65.0,
        ph: 6.5
    },
    trends: {
        moisture: "declining",
        temperature: "stable"
    },
    analysis: {
        healthScore: 75,
        irrigationRecommendation: "...",
        fertilizerRecommendation: "..."
    }
}
```

#### `getCropKnowledge(cropName)`
Returns crop-specific knowledge from built-in database.

**Supported Crops:**
- Rice, Wheat, Maize
- Tomato, Potato, Onion, Chilli
- Cotton, Sugarcane, Groundnut

---

## 6.2 CropPriceService

**File:** `services/CropPriceService.js`

Fetches real-time crop prices from government APIs with caching.

### Features:
- 24-hour caching using node-cache
- Automatic fallback to demo data
- Data from AGMARKNET (Government of India)

### Key Methods:

#### `getCropPrice(cropName, state)`
```javascript
async getCropPrice(cropName, state = 'Karnataka') {
    // 1. Check cache
    // 2. Call government API
    // 3. Process and normalize data
    // 4. Cache result
    // 5. Return price data
}
```

#### `getFallbackPrice(cropName)`
Returns demo prices when API is unavailable.

---

## 6.3 FarmGuidanceService

**File:** `services/farmGuidanceService.js`

Provides farming recommendations and guidance.

---

# 7. MIDDLEWARE

## 7.1 Authentication Middleware

**File:** `middleware/auth.js`

JWT-based authentication for protected routes.

```javascript
const auth = async (req, res, next) => {
    try {
        // 1. Extract token from Authorization header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // 3. Get user from database
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        // 4. Attach user to request
        req.user = user;
        next();

    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};
```

### Usage:
```javascript
// Protect a route
router.get('/farms', auth, async (req, res) => {
    // req.user is available here
    const farms = await Farm.find({ owner: req.user.id });
});
```

---

## 7.2 Validation Middleware

**File:** `middleware/validation.js`

Request validation using Joi schemas.

---

# 8. CONFIGURATION

## 8.1 Environment Variables

Create a `.env` file in the backend root:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/farmassist

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=AIza...your-gemini-api-key

# Government Data API (for crop prices)
DATA_GOV_IN_API_KEY=your-data-gov-api-key

# Raspberry Pi IoT
PI_IP=http://192.168.1.100:5000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 8.2 Database Connection

**File:** `src/db/db.js`

```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

function connectDB() {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('✅ MongoDB connected successfully');
        })
        .catch((error) => {
            console.error('❌ MongoDB connection error:', error);
            process.exit(1);
        });
}

module.exports = connectDB;
```

---

# 9. ERROR HANDLING

## 9.1 Standard Error Responses

### 400 Bad Request
```json
{
    "success": false,
    "message": "Validation error",
    "errors": ["Email is required", "Password must be at least 6 characters"]
}
```

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Access denied. No token provided."
}
```

### 404 Not Found
```json
{
    "success": false,
    "message": "Farm not found or access denied"
}
```

### 409 Conflict
```json
{
    "success": false,
    "message": "User already exists with this email"
}
```

### 500 Internal Server Error
```json
{
    "success": false,
    "message": "Internal server error",
    "details": "Error details (development mode only)"
}
```

## 9.2 Error Handling Pattern

```javascript
async function handler(req, res) {
    try {
        // Business logic
        
    } catch (error) {
        console.error('Error:', error);
        
        // Handle specific errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate entry'
            });
        }
        
        // Generic error
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
```

---

# 10. DEPLOYMENT

## 10.1 Development Setup

```bash
# Clone repository
git clone <repository-url>
cd farm-project/backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your configuration
# ...

# Start development server (with nodemon)
npm run dev
```

## 10.2 Production Deployment

```bash
# Install dependencies (production only)
npm install --production

# Set NODE_ENV
export NODE_ENV=production

# Start server
npm start
```

## 10.3 PM2 Deployment (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server.js --name farmassist-backend

# Enable startup on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

## 10.4 Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t farmassist-backend .
docker run -p 5000:5000 --env-file .env farmassist-backend
```

---

# APPENDIX

## A. NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Start production server |
| `dev` | `nodemon server.js` | Start development server |
| `test` | `jest` | Run tests |

## B. Health Check Endpoints

```
GET /api/health
```
Returns server health status.

```
GET /
```
Returns API information and available endpoints.

```
GET /smartroutes
```
Returns list of all available features.

---

*Documentation Version: 1.0.0*
*Last Updated: December 7, 2025*
*FarmAssist Backend - Smart Agriculture API*
