import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import illustrationRoutes from './routes/illustrationRoutes.js';
import followRoutes from './routes/followRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initializeSocket(server);

// Middleware configurations
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads serving
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Route definitions
app.use('/api/auth', authRoutes);
app.use('/api/illustrations', illustrationRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// Serving React frontend static files in production (only if dist folder exists)
const distPath = path.join(__dirname, '../frontend/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
  console.log('[Server] Production mode: Serving React frontend static files.');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
} else {
  console.log('[Server] API mode: Running standalone backend service.');
  app.get('/', (req, res) => {
    res.send('API is running successfully...');
  });
}

// Global error boundary middleware
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'An internal server error occurred',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
