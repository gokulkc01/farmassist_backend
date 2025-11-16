const multer = require('multer');
const fs = require('fs');
const path = require('path');
const express = require("express");
const router = express.Router();

// Assuming this file is in 'backend/routes/' and the 'uploads' folder should be in 'backend/'
// We use 'path.join(__dirname, '..', 'uploads')' to go up one level (to 'backend') and then into 'uploads'.
const uploadDir = path.join(__dirname, '..', 'uploads');
const plantHealth = require('../controllers/PlantHealth')

// --- 1. ENSURE DIRECTORY EXISTS ---
// It's a best practice to ensure the directory exists synchronously before defining storage.
if (!fs.existsSync(uploadDir)) {
    console.log(`Creating upload directory: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // ✅ FIX: Use the absolute path defined above.
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use the unique timestamp and original extension
        cb(null, Date.now() + path.extname(file.originalname));
    }
});


const upload = multer({ storage: storage });

// The route is defined here
router.post('/health', upload.single('photo'), plantHealth);

module.exports = router;
