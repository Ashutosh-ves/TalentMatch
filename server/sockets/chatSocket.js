const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Application = require('../models/Application');
const Message = require('../models/Message');

/**
 * Initializes Socket.IO event handlers and authentication middleware for real-time messaging.
 * @param {import('socket.io').Server} io
 */
const initChatSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (token && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Join chat room tied to an applicationId
    socket.on('join_room', async (data, callback) => {
      try {
        const applicationId = typeof data === 'string' ? data : data?.applicationId;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
          const errPayload = { message: 'Valid applicationId is required' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        const application = await Application.findById(applicationId).populate('openingId');
        if (!application) {
          const errPayload = { message: 'Application not found' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        // Authorization check: must be the student applicant or the opening recruiter (or admin)
        const isApplicant = application.studentId.toString() === socket.user._id.toString();
        const isRecruiter =
          application.openingId &&
          application.openingId.recruiterId.toString() === socket.user._id.toString();
        const isAdmin = socket.user.role === 'admin';

        if (!isApplicant && !isRecruiter && !isAdmin) {
          const errPayload = { message: 'Forbidden: You are not authorized to join this chat' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        // Chat gating: only allowed when application status is 'shortlisted' or 'accepted'
        if (!['shortlisted', 'accepted'].includes(application.status)) {
          const errPayload = {
            status: 403,
            message: `Forbidden: Chat is only allowed when application status is shortlisted or accepted (current status: "${application.status}")`,
          };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        const roomName = `application_${applicationId}`;
        socket.join(roomName);

        const successPayload = {
          success: true,
          applicationId,
          room: roomName,
          user: { id: socket.user._id, name: socket.user.name, role: socket.user.role },
        };

        socket.emit('joined_room', successPayload);
        if (typeof callback === 'function') callback(successPayload);
      } catch (err) {
        console.error('Socket join_room error:', err.message);
        socket.emit('error', { message: 'Internal server error joining room' });
      }
    });

    // Leave chat room
    socket.on('leave_room', (data, callback) => {
      const applicationId = typeof data === 'string' ? data : data?.applicationId;
      if (applicationId) {
        socket.leave(`application_${applicationId}`);
        socket.emit('left_room', { applicationId });
        if (typeof callback === 'function') callback({ success: true, applicationId });
      }
    });

    // Send a real-time message
    socket.on('send_message', async (data, callback) => {
      try {
        const { applicationId, text } = data || {};

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
          const errPayload = { message: 'Valid applicationId is required' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        if (!text || typeof text !== 'string' || !text.trim()) {
          const errPayload = { message: 'Message text cannot be empty' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        const application = await Application.findById(applicationId).populate('openingId');
        if (!application) {
          const errPayload = { message: 'Application not found' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        // Authorization check
        const isApplicant = application.studentId.toString() === socket.user._id.toString();
        const isRecruiter =
          application.openingId &&
          application.openingId.recruiterId.toString() === socket.user._id.toString();
        const isAdmin = socket.user.role === 'admin';

        if (!isApplicant && !isRecruiter && !isAdmin) {
          const errPayload = { message: 'Forbidden: You cannot send messages for this application' };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        // Chat gating: only allowed when application status is 'shortlisted' or 'accepted'
        if (!['shortlisted', 'accepted'].includes(application.status)) {
          const errPayload = {
            status: 403,
            message: `Forbidden: Cannot send messages. Chat is only allowed when application status is shortlisted or accepted (current status: "${application.status}")`,
          };
          socket.emit('error', errPayload);
          if (typeof callback === 'function') callback({ success: false, ...errPayload });
          return;
        }

        // Persist message in MongoDB
        const message = await Message.create({
          applicationId,
          senderId: socket.user._id,
          text: text.trim(),
          timestamp: new Date(),
        });

        const populatedMessage = await Message.findById(message._id).populate(
          'senderId',
          'name email role'
        );

        const roomName = `application_${applicationId}`;
        io.to(roomName).emit('receive_message', populatedMessage);

        if (typeof callback === 'function') {
          callback({ success: true, message: populatedMessage });
        }
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('error', { message: 'Internal server error sending message' });
      }
    });
  });
};

module.exports = initChatSocket;

