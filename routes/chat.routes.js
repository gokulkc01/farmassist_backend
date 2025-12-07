const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const authMiddleware = require('../middleware/auth');

console.log('ChatController type:', typeof ChatController);
console.log('ChatController methods:', Object.keys(ChatController));

if (typeof ChatController.handleChat !== 'function') {
  console.error('❌ ERROR: ChatController.handleChat is not a function!');
  console.error('Available methods:', Object.keys(ChatController));
  process.exit(1);
}

router.post('/chat', authMiddleware, ChatController.handleChat);
router.get('/chat/history/:farmId', authMiddleware, ChatController.getChatHistory);
 router.delete('/chat/history/:farmId', authMiddleware, ChatController.clearChatHistory);
router.get('/chat/stats/:farmId', authMiddleware, ChatController.getConversationStats);

module.exports = router;