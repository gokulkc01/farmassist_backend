// test-controller.js
const ChatController = require('./controllers/ChatController');

console.log('Type:', typeof ChatController);
console.log('Methods:', Object.keys(ChatController));
console.log('handleChat:', typeof ChatController.handleChat);
console.log('getChatHistory:', typeof ChatController.getChatHistory);

// Test if they're functions
console.log('\nAre they functions?');
console.log('handleChat:', typeof ChatController.handleChat === 'function');
console.log('getChatHistory:', typeof ChatController.getChatHistory === 'function');