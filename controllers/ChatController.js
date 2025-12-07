// controllers/ChatController.js
const ChatHistory = require('../models/ChatHistory');
const EnhancedAIAgentService = require('../services/EnhancedAIAgentService');

/**
 * ChatController - Handles all chat-related endpoints
 */
class ChatController {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.handleChat = this.handleChat.bind(this);
    this.getChatHistory = this.getChatHistory.bind(this);
    this.clearChatHistory = this.clearChatHistory.bind(this);
    this.getConversationStats = this.getConversationStats.bind(this);
    this.testEndpoint = this.testEndpoint.bind(this);
    
    console.log('✅ ChatController initialized');
  }

  /**
   * POST /api/chat - Main chat endpoint
   */
  async handleChat(req, res) {
    try {
      console.log('📩 Chat request received:', {
        farmId: req.body.farm_id,
        messageLength: req.body.message?.length,
        language: req.body.language
      });

      const { farm_id, message, language = 'en' } = req.body;

      // Validation
      if (!farm_id) {
        return res.status(400).json({
          status: 'error',
          error: 'farm_id is required'
        });
      }

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          error: 'message is required and cannot be empty'
        });
      }
       
      // Validate language
      const supportedLanguages = ['en', 'kn', 'hi', 'ta'];
      const selectedLanguage = supportedLanguages.includes(language) ? language : 'en';

      console.log('🤖 Calling AI agent...');

      // Get AI response
      const response = await EnhancedAIAgentService.chatResponse(
        farm_id,
        message,
        selectedLanguage
      );

      console.log('✅ AI response generated');

      // Save to chat history
      try {
        await ChatHistory.create({
          farmId: farm_id,
          message: message,
          response: response,
          context: {
            language: selectedLanguage,
            timestamp: Date.now()
          }
        });
        console.log('💾 Chat saved to history');
      } catch (saveError) {
        console.error('⚠️ Failed to save chat history:', saveError.message);
        // Continue anyway - don't fail the request
      }

      // Return response
      res.json({
        status: 'success',
        farm_id,
        message,
        response,
        language: selectedLanguage,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Chat controller error:', error);
      
      res.status(500).json({
        status: 'error',
        error: 'Failed to process chat message',
        message: error.message
      });
    }
  }

  /**
   * GET /api/chat/history/:farmId - Get chat history
   */
  async getChatHistory(req, res) {
    try {
      const { farmId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;

      console.log(`📜 Fetching chat history for farm: ${farmId}`);

      if (!farmId) {
        return res.status(400).json({
          status: 'error',
          error: 'farmId is required'
        });
      }

      const history = await ChatHistory.find({ farmId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await ChatHistory.countDocuments({ farmId });

      res.json({
        status: 'success',
        farmId,
        count: history.length,
        totalCount,
        hasMore: (skip + history.length) < totalCount,
        history: history.reverse() // Return in chronological order
      });

    } catch (error) {
      console.error('❌ Error fetching chat history:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch chat history',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/chat/history/:farmId - Clear chat history
   */
  async clearChatHistory(req, res) {
    try {
      const { farmId } = req.params;

      console.log(`🗑️ Clearing chat history for farm: ${farmId}`);

      if (!farmId) {
        return res.status(400).json({
          status: 'error',
          error: 'farmId is required'
        });
      }

      const result = await ChatHistory.deleteMany({ farmId });

      res.json({
        status: 'success',
        message: `Cleared ${result.deletedCount} chat messages`,
        farmId,
        deletedCount: result.deletedCount
      });

    } catch (error) {
      console.error('❌ Error clearing chat history:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to clear chat history',
        message: error.message
      });
    }
  }

  /**
   * GET /api/chat/stats/:farmId - Get conversation statistics
   */
  async getConversationStats(req, res) {
    try {
      const { farmId } = req.params;

      console.log(`📊 Getting conversation stats for farm: ${farmId}`);

      if (!farmId) {
        return res.status(400).json({
          status: 'error',
          error: 'farmId is required'
        });
      }

      const stats = await ChatHistory.aggregate([
        { $match: { farmId } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            avgMessageLength: { $avg: { $strLenCP: '$message' } },
            avgResponseLength: { $avg: { $strLenCP: '$response' } },
            firstMessage: { $min: '$createdAt' },
            lastMessage: { $max: '$createdAt' }
          }
        }
      ]);

      // Get language breakdown
      const languageStats = await ChatHistory.aggregate([
        { $match: { farmId } },
        {
          $group: {
            _id: '$context.language',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        status: 'success',
        farmId,
        stats: stats[0] || {
          totalMessages: 0,
          avgMessageLength: 0,
          avgResponseLength: 0,
          firstMessage: null,
          lastMessage: null
        },
        languageBreakdown: languageStats
      });

    } catch (error) {
      console.error('❌ Error getting conversation stats:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to get conversation stats',
        message: error.message
      });
    }
  }

  /**
   * GET /api/chat/test - Test endpoint
   */
  async testEndpoint(req, res) {
    res.json({
      status: 'success',
      message: 'ChatController is working!',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'POST /api/chat - Send a chat message',
        'GET /api/chat/history/:farmId - Get chat history',
        'DELETE /api/chat/history/:farmId - Clear chat history',
        'GET /api/chat/stats/:farmId - Get conversation stats',
        'GET /api/chat/test - This endpoint'
      ]
    });
  }
}

// CRITICAL: Export as instance, not class
module.exports = new ChatController();