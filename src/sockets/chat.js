const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const constants = require('../constants');
const { isValidObjectId } = require('mongoose');

module.exports = (io) => {
    io.on('connection', async (socket) => {
        const session = socket.request.session;
        const userId = session ? session.userId : null;

        function isLoggedIn() {
            return session !== null && session.userId !== null;
        }

        // Ensure session and userId exist
        if (!isLoggedIn()) {
            socket.disconnect();
            return;
        }

        // Ensure userId references a real user
        const user = await User.findById(userId);
        if (!user) {
            socket.disconnect();
            return;
        }

        console.log(`User connected: ${userId}`);

        // Update user online status
        user.online = true;
        try {
            await user.save();
        } catch (err) {
            console.error('Failed to save user when updating online status:', err);
        }

        if (!socket.recovered) {
            // Join user's conversation rooms
            Conversation.find({ members: userId })
                .then(conversations => {
                    conversations.forEach(convo => {
                        socket.join(`convo_${convo._id}`);
                    });
                })
                .catch(console.error);
        }

        // Broadcast user online status
        socket.broadcast.emit('user:online', { userId });

        // Handle creating a conversation
        socket.on('conversation:new', async ({ type, memberIds, name }) => {
            try {
                if (!type || !memberIds || !Array.isArray(memberIds)) {
                    throw new Error('Invalid data');
                }

                // Add current user to members if not included
                const allMembers = [... new Set([userId, ...memberIds])];
                console.log("New convo:", allMembers, type, memberIds, name);

                // For DMs, check if the conversation already exists
                if (type === 'dm') {
                    if (allMembers.length !== 2) {
                        throw new Error('DM must have exactly 2 members');
                    }

                    // Check for existing DM
                    const existingDM = await Conversation.findOne({
                        type: 'dm',
                        members: { $all: allMembers, $size: 2 }
                    });

                    if (existingDM) {
                        await existingDM.populate('members', 'username colorHue online');
                        socket.emit('conversation:join', existingDM);
                        return;
                    }
                } else {
                    const existingGroup = await Conversation.findOne({
                        type: 'group',
                        members: { $all: allMembers }
                    });

                    if (existingGroup) {
                        await existingGroup.populate('members', 'username colorHue online');
                        socket.emit('conversation:join', existingGroup);
                        return;
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
                socket.emit('conversation:join', conversation);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // Handle joining a specific conversation
        socket.on('conversation:join', async (conversationId) => {
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            if (!isValidObjectId(conversationId)) {
                socket.emit('error', { message: 'Invalid conversation id' });
                return;
            }

            try {
                const conversation = await Conversation.findById(conversationId);
                if (conversation && conversation.members.includes(userId)) {
                    socket.join(`convo_${conversationId}`);
                    console.log(`User ${userId} joined conversation ${conversationId}`);
                } else {
                    socket.emit('error', { message: 'Unable to find a conversation with that id, or you don\'t have access' });
                }
            } catch (err) {
                console.error('Error joining conversation:', err);
                socket.emit('error', { message: 'An error has occurred' });
                return;
            }
        });

        // Handle editing a group chat
        socket.on('conversation:edit', async (data) => {
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            try {
                const { conversationId, newData } = data;

                // Find the conversation and ensure the user is a member
                const conversation = await Conversation.findById(conversationId);
                if (!conversation || !conversation.members.includes(userId)) {
                    console.log(conversation.members, userId);
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                // DM check; cannot edit DMs
                if (conversation.type === 'dm') {
                    socket.emit('error', { message: 'Cannot edit a DM' });
                    return;
                }

                let editType;

                if (typeof (newData) === 'string') { // New name
                    editType = 'name';
                    const shortenedName = newData.trim().slice(0, 24).trim(); // Limit to 24 characters, trim twice since we may encounter a space after slicing
                    conversation.name = shortenedName;
                } else if (newData instanceof Array) { // Modified members
                    editType = 'members';

                    // Check if the user owns the conversation
                    if (conversation.members[0]._id.toString() !== userId) {
                        console.log(conversation.members[0]._id, userId);
                        socket.emit('error', { message: 'Access denied' });
                        return;
                    }

                    newData.forEach(({ userId, added }) => {
                        if (added) {
                            conversation.members.push(userId);
                        } else {
                            const index = conversation.members.indexOf(userId);
                            if (index !== -1) conversation.members.splice(index, 1);
                        }
                    });

                    // Include basic user data before sending to clients
                    await conversation.populate('members', constants.USER_CONVERSATION_PUBLIC_PROPERTIES);
                } else {
                    socket.emit('error', { message: 'Invalid data type' });
                    return;
                }

                await conversation.save();

                // Broadcast to room
                io.to(`convo_${conversationId}`).emit('conversation:edit', {
                    conversationId,
                    // Formats the key to 'newName' or 'newMembers', then provides either the new name or members value
                    ['new' + (editType.slice(0, 1).toUpperCase() + editType.slice(1))]: (editType === 'name' ? conversation.name : conversation.members)
                });
            } catch (err) {
                console.error('Error editing conversation', err);
            }
        });

        // Handle new message
        socket.on('message:send', async (data) => {
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            try {
                const { conversationId, text } = data;

                // Verify user is a member
                const conversation = await Conversation.findById(conversationId);
                if (!conversation || !conversation.members.includes(userId)) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                const maxMessageLength = constants.MESSAGE_MAX_LENGTH;
                let trimmedText = text.trim().replace(/  +/g, ' '); // Trim trailing spaces, and replace duplicate spaces with just one
                if (trimmedText.length > maxMessageLength) { // Trim if exceeds max length
                    trimmedText = trimmedText.substring(0, maxMessageLength);
                    socket.emit('notice', { message: `Your message was trimmed due to exceeding the max message length of ${maxMessageLength} characters. If this continues to occur, please update/reload the application.` });
                }

                // Create message
                const message = new Message({
                    conversation: conversationId,
                    sender: userId,
                    text: trimmedText
                });

                await message.save();
                await message.populate('sender', constants.USER_MESSAGE_PUBLIC_PROPERTIES);

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
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            try {
                const { messageId, text } = data;

                // Find the message and ensure it was sent by the user
                const message = await Message.findById(messageId);
                if (!message || message.sender._id.toString() !== userId) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                // Check 5 minute window
                const fiveMinutesAgo = new Date(Date.now() - constants.MESSAGE_EDIT_WINDOW * 60 * 1000);
                if (message.createdAt < fiveMinutesAgo) {
                    socket.emit('error', { message: 'Edit window expired' });
                    return;
                }

                const cleanedText = text.trim().replace(/  +/g, ' ').substring(0, constants.MESSAGE_MAX_LENGTH);
                if (cleanedText === message.text) {
                    // No error as the user likely intended to cancel
                    return;
                }

                // Update the message data
                message.text = cleanedText;
                message.edited = true;
                await message.save();
                await message.populate('sender', constants.USER_MESSAGE_PUBLIC_PROPERTIES);

                // Broadcast update
                io.to(`convo_${message.conversation}`).emit('message:edited', message);
            } catch (err) {
                console.error('Error editing message:', err);
                socket.emit('error', { message: 'Failed to edit message' });
            }
        });

        // Handle message delete
        socket.on('message:delete', async (messageId) => {
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            try {
                // Find the message and ensure it was sent by the user
                const message = await Message.findById(messageId);
                if (!message || message.sender.toString() !== userId.toString()) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                const originalContents = message.text;

                // Update the message data
                message.deleted = true;
                message.text = '[deleted]';
                await message.save();

                // Update conversation last message contents if that was the last message
                const conversation = await Conversation.findById(message.conversation);
                if (conversation && conversation.lastMessage.text === originalContents) {
                    // At some point this could instead fetch the new last message and update accordingly
                    conversation.lastMessage.text = '[deleted]';
                }

                // Broadcast deletion
                io.to(`convo_${message.conversation}`).emit('message:deleted', { messageId });
            } catch (err) {
                console.error('Error deleting message:', err);
                socket.emit('error', { message: 'Failed to delete message' });
            }
        });

        // Handle typing indicator
        socket.on('typing:start', (conversationId) => {
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            // Emit the typing event
            socket.to(`convo_${conversationId}`).emit('user:typing', {
                username: session.username,
                conversationId
            });
        });

        socket.on('typing:stop', (conversationId) => {
            if (!isLoggedIn()) {
                socket.emit('error', { message: 'You are not logged in.' });
                return;
            }

            // Emit the stopped typing event
            socket.to(`convo_${conversationId}`).emit('user:stopped-typing', {
                username: session.username,
                conversationId
            });
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${userId}`);

            try {
                // Broadcast user offline status
                socket.broadcast.emit('user:offline', { userId });

                // Find the user and update status parameters
                user.online = false;
                user.save();
            } catch (err) {
                console.error('Error updating user status:', err);
            }
        });
    });
};
