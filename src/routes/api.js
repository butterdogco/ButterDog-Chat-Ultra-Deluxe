const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET /api/messages?room=roomName&limit=20
router.get('/messages', async (req, res) => {
  // Request validation
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!req.query.room) {
    return res.status(400).json({ error: 'Room parameter is required' });
  }
  if (req.query.limit && isNaN(parseInt(req.query.limit))) {
    return res.status(400).json({ error: 'Limit must be a number' });
  }

  const room = req.query.room || 'global';
  const limit = parseInt(req.query.limit) || 20;

  try {
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
    res.json(messages.reverse()); // Reverse to get chronological order
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;