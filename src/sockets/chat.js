const Message = require('../models/Message');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Join default room
    socket.on('joinRoom', (room) => {
      socket.join(room);
    });

    // Handle new messages
    socket.on('chatMessage', async (data) => {
      // data: { room, sender, text }
      const message = new Message({
        room: data.room,
        sender: data.sender,
        text: data.text,
        timestamp: new Date(),
      });
      await message.save();

      // Emit to everyone but sender
      socket.to(data.room).emit('message', message);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
}