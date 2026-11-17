const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./src/config/env');
const authRoutes = require('./src/routes/auth');
const roomsRoutes = require('./src/routes/rooms');
const reportsRoutes = require('./src/routes/reports');
const authMiddleware = require('./src/middleware/auth');

const app = express();

// Allowed Origins for CORS (Expo Web, mobile, curl)
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:19000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// Static serving untuk foto laporan (tidak perlu auth — UUID acak sudah cukup aman)
// URL format: http://<host>:3000/uploads/reports/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'kampuscare-backend',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout)
app.use('/api/auth', authRoutes);

// Protected rooms route (GET /api/rooms)
app.use('/api/rooms', authMiddleware, roomsRoutes);

// Protected reports routes (/api/reports)
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Global error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Terjadi kesalahan internal server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

module.exports = app;
