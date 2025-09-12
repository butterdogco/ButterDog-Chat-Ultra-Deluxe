const { on } = require('connect-mongo');
const Message = require('../models/Message');

let onlineUsers = {}; // { socketId: {uuid, username} }

module.exports = (io) => {
  io.on('connection', (socket) => {
    const session = socket.request.session;
    const userUUID = session && session.uuid;
    const username = session && session.username;
    
    // Join default room
    socket.on('joinRoom', (room) => {
      socket.join(room);
      onlineUsers[socket.id] = { uuid: userUUID, username: username };
    });

    
    // Handle new messages
    socket.on('chatMessage', async (data) => {
      // Use username from session, not from client
      if (!username) {
        // Optionally, you can disconnect or emit an error
        socket.emit('message', { sender: 'System', text: 'You are not authenticated.', timestamp: new Date() });
        return;
      }
      const message = new Message({
        room: data.room,
        sender: username,
        senderUUID: userUUID,
        text: data.text,
        timestamp: new Date(),
      });
      await message.save();

      // Emit to everyone but sender
      socket.to(data.room).emit('message', message);
    });

    // Online users list request
    socket.on('getOnlineUsers', () => {
      const users = Object.values(onlineUsers);
      socket.emit('onlineUsers', users);
    });

    // Handle reconnection
    socket.on('reconnect', () => {
      if (username) {
        onlineUsers[socket.id] = { uuid: userUUID, username: username };
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected');
      const onlineIndex = Object.keys(onlineUsers).indexOf(socket.id);
      if (onlineIndex !== -1) {
        delete onlineUsers[socket.id];
      }
    });
  });
}