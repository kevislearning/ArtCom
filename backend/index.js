import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';

// Nhập các route
import authRoutes from './routes/authRoutes.js';
import illustrationRoutes from './routes/illustrationRoutes.js';
import followRoutes from './routes/followRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';


// Kết nối đến cơ sở dữ liệu MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Khởi tạo WebSockets
initializeSocket(server);

// Cấu hình các middleware
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

// Cung cấp thư mục uploads tĩnh
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Định nghĩa các API Route
app.use('/api/auth', authRoutes);
app.use('/api/illustrations', illustrationRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Endpoint kiểm tra sức khỏe hệ thống (health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// Cung cấp các file tĩnh của React frontend trong môi trường production (chỉ khi có thư mục dist)
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

// Middleware xử lý lỗi toàn cục (global error boundary)
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
