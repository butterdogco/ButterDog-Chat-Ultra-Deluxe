const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    type: { type: String, enum: ['dm', 'group'], required: true },
    name: { type: String, default: '' }, // used for group chats
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastMessage: {
        text: String,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
    }
});

module.exports = mongoose.model('Conversation', ConversationSchema);