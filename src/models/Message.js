const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', MessageSchema);