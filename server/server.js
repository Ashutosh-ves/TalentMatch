const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// Load environment variables (from server/.env and root .env fallback)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const validateEnv = require('./config/env');

// Validate required environment variables before connecting to DB
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const initChatSocket = require('./sockets/chatSocket');

// Route imports
const adminRoutes = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const openingRoutes = require('./routes/openingRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');
const studentRoutes = require('./routes/studentRoutes');

// Connect to MongoDB Atlas
connectDB();

const app = express();
const server = http.createServer(app);

// Configure Express trust proxy before rate limiters (defaults to 1 in production, 0 otherwise)
const rawTrustProxy = process.env.TRUST_PROXY;
const parsedTrustProxy = Number(rawTrustProxy);
const trustProxy =
  rawTrustProxy !== undefined && rawTrustProxy.trim() !== '' && Number.isFinite(parsedTrustProxy)
    ? parsedTrustProxy
    : process.env.NODE_ENV === 'production'
      ? 1
      : 0;
app.set('trust proxy', trustProxy);

// CORS origin parsing from CLIENT_URL (comma-separated list, default http://localhost:5173)
const rawClientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(
    rawClientUrls.map((rawUrl) => {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.pathname && parsed.pathname !== '/') {
          console.warn(
            `[CORS] Warning: CLIENT_URL entry "${rawUrl}" contains a path ("${parsed.pathname}"). CORS origins must not include paths.`
          );
        }
      } catch (err) {
        console.warn(`[CORS] Warning: CLIENT_URL entry "${rawUrl}" failed to parse with new URL(): ${err.message}`);
      }
      return rawUrl.replace(/\/+$/, '');
    })
  )
);

console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl) or matched origins
    if (!origin) {
      return callback(null, true);
    }
    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
};

// Initialize Socket.IO with restricted CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Wire Socket.IO handlers
initChatSocket(io);

// Expose io instance to Express app
app.set('io', io);

// Security & Logging Middleware
app.use(helmet());

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

app.use(cors(corsOptions));
app.use(express.json());

// Rate limiter for /api/auth (20 requests per 15 min per IP in production, 200 otherwise)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post('/api/auth/login', authLimiter);
app.post('/api/auth/register', authLimiter);

// Base health endpoints
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Talent Match API is running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/openings', openingRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/students', studentRoutes);

// Centralized error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  const forceTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out after 10s; forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  try {
    await new Promise((resolve) => {
      io.close(() => resolve());
    });

    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
            return reject(err);
          }
          return resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    clearTimeout(forceTimer);
    console.log('Graceful shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    clearTimeout(forceTimer);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };
