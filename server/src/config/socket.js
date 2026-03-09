const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { socketHandler } = require('../socket/socketHandler');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  socketHandler(io);
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };
