import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';

export let socket: Socket | null = null;

export const initSocket = (token: string, onNotification: (notif: any) => void, onMessage: (msg: any) => void) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
    socket?.emit('authenticate', token);
  });

  socket.on('new_notification', (notification) => {
    console.log('[Socket] Received Notification:', notification);
    onNotification(notification);
  });

  socket.on('new_message', (message) => {
    console.log('[Socket] Received Message:', message);
    onMessage(message);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from server');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
