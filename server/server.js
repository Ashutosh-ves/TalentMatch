const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables (from server/.env and root .env fallback)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const initChatSocket = require('./sockets/chatSocket');

// Route imports
const adminRoutes = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const openingRoutes = require('./routes/openingRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');
const studentRoutes = require('./routes/studentRoutes');

// Connect to MongoDB Atlas
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Wire Socket.IO handlers
initChatSocket(io);

// Expose io instance to Express app
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/openings', openingRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/students', studentRoutes);

// Centralized error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
