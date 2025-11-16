const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const plantHealth = async (req, res) => {
    console.log(req.file);
  // Validate file presence
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      error: 'No photo uploaded. Make sure the input name is `photo`.' 
    });
  }

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;

  // Ensure API key exists
  if (!process.env.GEMINI_API_KEY) {
    // Remove uploaded file to avoid leaking temp files
    try { 
      fs.unlinkSync(filePath); 
    } catch (e) {
      console.warn('Failed to remove temp file:', e);
    }
    return res.status(500).json({ 
      success: false, 
      error: 'Server misconfiguration: missing GEMINI_API_KEY' 
    });
  }

  try {
    // Read file as bytes
    const imageBytes = fs.readFileSync(filePath);
    const base64Image = imageBytes.toString("base64");

    // Use the correct model name - try these in order of preference
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Enhanced prompt for detailed plant health analysis with structured format
    const prompt = `Analyze this plant image and provide a health assessment in the following EXACT format:

🌿 PLANT IDENTIFIED: [Plant name]

⚠️ DISEASE/CONDITION: [Name of disease or health issue]

📋 SYMPTOMS OBSERVED:
• [Symptom 1]
• [Symptom 2]
• [Symptom 3]

🔍 POSSIBLE CAUSES:
• [Cause 1]
• [Cause 2]

💊 TREATMENT STEPS:
1. [Immediate action step]
2. [Follow-up action]
3. [Preventive measure]
4. [Additional care]

⚡ URGENT ACTIONS:
• [Most critical step to take immediately]

🛡️ PREVENTION:
• [How to prevent this in future]

Keep each point concise and actionable. Focus on practical solutions.
Along with english give the response in  simple local savage desi kannada and response must be formatted neatly.`;

    // Send prompt + image to Gemini
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      prompt
    ]);

    // Extract response text
    const response = await result.response;
    const description = response.text();

    // Clean up temp file (best effort)
    try { 
      fs.unlinkSync(filePath); 
    } catch (e) { 
      console.warn('Failed to remove temp file:', filePath, e); 
    }

    if (!description || description.trim() === '') {
      return res.status(502).json({ 
        success: false, 
        error: 'No description received from the AI service' 
      });
    }

    res.json({ 
      success: true, 
      description: description.trim(),
      analyzedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Error analyzing photo:", err);
    
    // Clean up temp file if exists
    try { 
      fs.unlinkSync(filePath); 
    } catch (e) {
      console.warn('Failed to cleanup after error:', e);
    }
    
    // Provide more specific error message
    let errorMessage = 'Failed to analyze photo';
    
    if (err.message) {
      errorMessage = err.message;
    }
    
    // Handle specific Gemini API errors
    if (err.message && err.message.includes('API key')) {
      errorMessage = 'Invalid or expired API key';
    } else if (err.message && err.message.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (err.message && err.message.includes('SAFETY')) {
      errorMessage = 'Image was blocked by safety filters';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
};

module.exports =  plantHealth;