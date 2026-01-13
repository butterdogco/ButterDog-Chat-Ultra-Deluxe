const express = require("express");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const router = express.Router();

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// Apply auth to all API routes
router.use(requireAuth);

// GET /api/users/:id/profile -> Returns the profile of the provided user
router.get('/users/:id/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-passwordHash');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            username: user.username,
            colorHue: user.colorHue,
            about: user.about,
            joinedAt: user.joinedAt,
            online: user.online,
            lastSeen: user.lastSeen
        });
    } catch (err) {
        console.error('GET users/:id/profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/users/me -> Updates own profile with the provided details
router.patch('/users/me', async (req, res) => {
    try {
        const { about, colorHue } = req.body;
        const updates = {};

        if (about !== undefined) updates.about = about;
        if (colorHue !== undefined) {
            // Validate
            if (colorHue < 0 || colorHue > 360) {
                return res.status(400).json({ error: 'colorHue must be between 0 and 360' });
            }
            updates.colorHue = colorHue;
        }

        const user = await User.findByIdAndUpdate(
            req.session.userId,
            updates,
            { new: true }
        ).select('-passwordHash');

        res.json(user);
    } catch (err) {
        console.error('PATCH users/me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

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
            .select('username colorHue online')
            .limit(10);
        
        res.json(users);
    } catch (err) {
        console.error('User search error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/conversations -> Creates a conversation with the provided details
router.post('/conversations', async (req, res) => {
    try {
        const { type, memberIds, name } = req.body;
        const currentUserId = req.session.userId;

        // Validate
        if (!type || !memberIds || !Array.isArray(memberIds)) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        // Add current user to members if not included
        const allMembers = [... new Set([currentUserId, ... memberIds])];
        console.log("New convo:", allMembers, type, memberIds, name);

        // For DMs, check if the conversation already exists
        if (type === 'dm') {
            if (allMembers.length !== 2) {
                return res.status(400).json({ error: 'DM must have exactly 2 members' });
            }

            // Check for existing DM
            const existingDM = await Conversation.findOne({
                type: 'dm',
                members: { $all: allMembers, $size: 2 }
            });

            if (existingDM) {
                console.log("existing DM");
                return res.json(existingDM);
            }
        }

        // Create new conversation
        const conversation = new Conversation({
            type,
            members: allMembers,
            name: type === 'group' ? name : ''
        });

        await conversation.save();
        await conversation.populate('members', 'username colorHue online');

        console.log("new convo")
        res.status(201).json(conversation);
    } catch (err) {
        console.error('POST conversations error:', err);
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

        const conversations = await Conversation.find({
            members: currentUserId
        })
            .populate('members', 'username colorHue online lastSeen')
            .populate('lastMessage.sender', 'username')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

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
            .populate('sender', 'username colorHue')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json(messages.reverse()); // Return oldest first for display
    } catch (err) {
        console.error('GET conversations/:id/messages error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/conversations/:id/messages -> Creates a message in the provided conversation
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const currentUserId = req.session.userId;
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Message text required' });
        }

        // Verify the user is a member
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.members.includes(currentUserId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Create message
        const message = new Message({
            conversation: conversationId,
            sender: currentUserId,
            text: text.trim()
        });

        await message.save();
        await message.populate('sender', 'username colorHue');

        // Update conversation's lastMessage
        conversation.lastMessage = {
            text: message.text,
            sender: currentUserId,
            createdAt: message.createdAt,
            messageId: message._id
        };
        conversation.updatedAt = new Date();
        await conversation.save();

        res.status(201).json(message);
    } catch (err) {
        console.error('POST conversations/:id/messages error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/messages/:id -> Edits the provided message
router.patch('/messages/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        const currentUserId = req.session.userId;
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check ownership
        if (message.sender.toString() !== currentUserId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check 5-minute edit window
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (message.createdAt < fiveMinutesAgo) {
            return res.status(403).json({ error: 'Edit window expired' });
        }

        message.text = text.trim();
        message.edited = true;
        await message.save();
        await message.populate('sender', 'username colorHue');

        res.json(message);
    } catch (err) {
        console.error('PATCH message/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/messages/:id -> Deletes the provided message
router.delete('/messages/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        const currentUserId = req.session.userId;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check ownership
        if (message.sender.toString() !== currentUserId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        message.deleted = true;
        message.text = '[deleted]';
        await message.save();

        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error('DELETE messages/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;