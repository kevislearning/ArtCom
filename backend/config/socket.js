import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;
const userSockets = new Map(); // Maps userId -> Array of socket.id

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] New connection established: ${socket.id}`);

    // Handle user authentication/identification on connect
    socket.on('authenticate', (token) => {
      try {
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        socket.userId = userId;

        if (!userSockets.has(userId)) {
          userSockets.set(userId, []);
        }
        userSockets.get(userId).push(socket.id);
        console.log(`[Socket] Authenticated User: ${userId} on Socket: ${socket.id}`);
        
        // Join their own room
        socket.join(userId);
      } catch (err) {
        console.error('[Socket Auth Error]', err.message);
      }
    });

    // Handle standard rooms or direct messaging triggers if any
    socket.on('join_chat', (otherUserId) => {
      if (socket.userId) {
        // Room specifically for these two users
        const roomName = [socket.userId, otherUserId].sort().join('-');
        socket.join(roomName);
        console.log(`[Socket] Socket ${socket.id} joined chat room: ${roomName}`);
      }
    });

    socket.on('typing_status', ({ receiverId, isTyping }) => {
      if (socket.userId) {
        const roomName = [socket.userId, receiverId].sort().join('-');
        socket.to(roomName).emit('typing_status', { senderId: socket.userId, isTyping });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      if (socket.userId) {
        const sockets = userSockets.get(socket.userId) || [];
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          userSockets.delete(socket.userId);
        }
        console.log(`[Socket] Cleaned up socket mapping for User: ${socket.userId}`);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized yet');
  }
  return io;
};

/**
 * Send an event directly to a specific user's connected socket sessions
 */
export const sendToUser = (userId, event, data) => {
  if (io && userId) {
    const stringId = userId.toString();
    io.to(stringId).emit(event, data);
  }
};
