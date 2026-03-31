const express = require("express");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { isValidObjectId } = require("mongoose");
const constants = require("../constants");

const router = express.Router();

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Apply auth to all API routes
router.use(requireAuth);

// GET /api/users/search?q=username -> Returns an array of users
router.get('/users/search', async (req, res) => {
    try {
        const query = req.query.q;
        const currentUserId = req.session.userId;

        if (!query || query.length < 2) {
            return res.json([]);
        }

        // Search for users (case-sensitive, partical match)
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: currentUserId }
        })
            .select(constants.USER_PUBLIC_PROPERTIES)
            .limit(10);
        
        res.json(users);
    } catch (err) {
        console.error('User search error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/conversations -> Returns conversations the user is apart of (paginated)
router.get('/conversations', async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Find the conversation
        const conversations = await Conversation.find({
            members: currentUserId
        })
            .populate('members', constants.USER_CONVERSATION_PUBLIC_PROPERTIES) // Include additional member info
            .populate('lastMessage.sender', 'username') // Include the sender's username of the last message
            .sort({ updatedAt: -1 }) // Sort by newest first
            .skip(skip) // Skip (for pages)
            .limit(limit); // Limit (for pages)

        res.json(conversations);
    } catch(err) {
        console.error('GET conversations error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/conversations/:id/messages -> Returns messages in a conversation
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const currentUserId = req.session.userId;
        const limit = parseInt(req.query.limit) || 20;
        const before = req.query.before; // timestamp or messageId

        // Verify if the conversation id is valid
        if (conversationId === undefined || !isValidObjectId(conversationId)) {
            return res.status(400).json({ error: 'Missing or invalid conversation id' });
        }

        // Verify user is a member of the conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.members.includes(currentUserId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Build query
        const query = {
            conversation: conversationId,
            deleted: false
        };

        if (before) {
            // If before is an ISO date, use it; otherwise treat as a messageId
            if (before.match(/^\d{4}-\d{2}-\d{2}/)) {
                query.createdAt = { $lt: new Date(before) };
            } else {
                const beforeMsg = await Message.findById(before);
                if (beforeMsg) {
                    query.createdAt = { $lt: beforeMsg.createdAt };
                }
            }
        }

        const messages = await Message.find(query)
            .populate('sender', constants.USER_MESSAGE_PUBLIC_PROPERTIES)
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json(messages.reverse()); // Return oldest first for display
    } catch (err) {
        console.error('GET conversations/:id/messages error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;