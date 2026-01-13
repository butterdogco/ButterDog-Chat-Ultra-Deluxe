const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Store online users: userId -> socketId
const onlineUsers = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        const session = socket.request.session;

        if (!session || !session.userId) {
            socket.disconnect();
            return;
        }

        const userId = session.userId;
        console.log(`User connected: ${userId}`);

        // Track online user
        onlineUsers.set(userId, toString(), socket.id);

        // Update user online status
        User.findByIdAndUpdate(userId, { online: true }).catch(console.error);

        // Join user's conversation rooms
        Conversation.find({ members: userId })
            .then(conversations => {
                conversations.forEach(convo => {
                    socket.join(`convo_${convo._id}`);
                });
            })
            .catch(console.error);
        
        // Broadcast user online status
        socket.broadcast.emit('user:online', { userId: userId });

        // Handle joining a specific conversation
        socket.on('conversation:join', async (conversationId) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if (conversation && conversation.members.includes(userId)) {
                    socket.join(`convo_${conversationId}`);
                    console.log(`User ${userId} joined conversation ${conversationId}`);
                }
            } catch (err) {
                console.error('Error joining conversation:', err);
            }
        });

        // Handle new message
        socket.on('message:send', async (data) => {
            try {
                const { conversationId, text } = data;

                // Verify user is a member
                const conversation = await Conversation.findById(conversationId);
                if (!conversation || !conversation.members.includes(userId)) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                // Create message
                const message = new Message({
                    conversation: conversationId,
                    sender: userId,
                    text: text.trim()
                });

                await message.save();
                await message.populate('sender', 'username colorHue');

                // Update conversation
                conversation.lastMessage = {
                    text: message.text,
                    sender: userId,
                    createdAt: message.createdAt,
                    messageId: message._id
                };
                conversation.updatedAt = new Date();
                await conversation.save();

                // Broadcast to conversation room
                io.to(`convo_${conversationId}`).emit('message:new', message);
            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle message edit
        socket.on('message:edit', async (data) => {
            try {
                const { messageId, text } = data;

                const message =  await Message.findById(messageId);
                if (!message || !message.sender.toString() !== userId.toString()) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                // Check 5 minute window
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                if (message.createdAt < fiveMinutesAgo) {
                    socket.emit('error', { message: 'Edit window expired' });
                    return;
                }

                message.text = text.trim();
                message.edited = true;
                await message.save();
                await message.populate('sender', 'username colorHue');

                // Broadcast update
                io.to(`convo_${message.conversation}`).emit('message:edited', message);
            } catch (err) {
                console.error('Error editing message:', err);
                socket.emit('error', { message: 'Failed to edit message' });
            }
        });

        // Handle message delete
        socket.on('message:delete', async (messageId) => {
            try {
                const message = await Message.findById(messageId);
                if (!message || !message.sender.toString() !== userId.toString()) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                message.deleted = true;
                message.text = '[deleted]';
                await message.save();

                // Broadcast deletion
                io.to(`convo_${message.conversation}`).emit('message:deleted', { messageId });
            } catch (err) {
                console.error('Error deleting message:', err);
                socket.emit('error', { message: 'Failed to delete message' });
            }
        });

        // Handle typing indicator
        socket.on('typing:start', (conversationId) => {
            socket.to(`convo_${conversationId}`).emit('user:typing', {
                userId: userId,
                username: session.username,
                conversationId
            });
        });

        socket.on('typing:stop', (conversationId) => {
            socket.to(`convo_${conversationId}`).emit('user:stopped-typing', {
                userId: userId,
                conversationId
            });
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${userId}`);
            onlineUsers.delete(userId, toString());

            try {
                await User.findByIdAndUpdate(userId, {
                    online: false,
                    lastSeen: new Date()
                });

                // Broadcast user offline status
                socket.broadcast.emit('user:offline', { userId });
            } catch (err) {
                console.error('Error updating user status:', err);
            }
        });
    });
};