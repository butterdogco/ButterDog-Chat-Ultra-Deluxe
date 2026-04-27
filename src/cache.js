const constants = require('./constants');

const messageCache = new Map(); // In-memory cache for messages, keyed by messageId
const conversationMessagesCache = new Map(); // Cache for conversation messages, keyed by conversationId
const conversationCache = new Map(); // Cache for conversations, keyed by conversationId

function addMessageToCache(message) {
  messageCache.set(message._id.toString(), message);

  // Add to conversation cache
  const conversationId = message.conversation.toString();
  if (!conversationMessagesCache.has(conversationId)) {
    conversationMessagesCache.set(conversationId, []);
  }

  const messages = conversationMessagesCache.get(conversationId);
  messages.push(message);

  // Keep only the most recent MESSAGES_CACHE_SIZE messages
  if (messages.length > constants.MESSAGES_CACHE_SIZE) {
    messages.shift(); // Remove the oldest message
  }
}

function getMessageFromCache(messageId) {
  return messageCache.get(messageId);
}

function removeMessageFromCache(messageId) {
  const message = messageCache.get(messageId);
  if (message) {
    const conversationId = message.conversation.toString();
    messageCache.delete(messageId);
  }

  if (conversationMessagesCache.has(conversationId)) {
    const messages = conversationMessagesCache.get(conversationId);
    const index = messages.findIndex(m => m._id.toString() === messageId);
    if (index !== -1) {
      messages.splice(index, 1); // Remove the message from the conversation cache
    }
  }
}

function updateMessageInCache(message) {
  messageCache.set(message._id.toString(), message);
  const conversationId = message.conversation.toString();
  if (conversationMessagesCache.has(conversationId)) {
    const messages = conversationMessagesCache.get(conversationId);
    const index = messages.findIndex(m => m._id.toString() === message._id.toString());
    if (index !== -1) {
      messages[index] = message; // Update the message in the conversation cache
    }
  }
}

function getMessagesForConversationFromCache(conversationId) {
  return conversationMessagesCache.get(conversationId) || [];
}

function addConversationToCache(conversation) {
  conversationCache.set(conversation._id.toString(), conversation);
}

function getConversationFromCache(conversationId) {
  return conversationCache.get(conversationId);
}

function removeConversationFromCache(conversationId) {
  conversationCache.delete(conversationId);
  conversationMessagesCache.delete(conversationId);
}

function updateConversationInCache(conversation) {
  conversationCache.set(conversation._id.toString(), conversation);
}

module.exports = {
  addMessageToCache,
  getMessageFromCache,
  removeMessageFromCache,
  getMessagesForConversationFromCache,
  addConversationToCache,
  getConversationFromCache,
  removeConversationFromCache,
  updateConversationInCache,
};