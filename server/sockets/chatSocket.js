const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Application = require('../models/Application');
const Message = require('../models/Message');

// In-memory room presence tracker: roomName -> Map<userId, socketCount>
const roomPresence = new Map();

function addUserToRoom(roomName, userId) {
  if (!roomPresence.has(roomName)) {
    roomPresence.set(roomName, new Map());
  }
  const userMap = roomPresence.get(roomName);
  const currentCount = userMap.get(userId) || 0;
  userMap.set(userId, currentCount + 1);
  return currentCount === 0; // True if this was user's first socket entering room
}

function removeUserFromRoom(roomName, userId) {
  if (!roomPresence.has(roomName)) return false;
  const userMap = roomPresence.get(roomName);
  const currentCount = userMap.get(userId) || 0;
  if (currentCount <= 1) {
    userMap.delete(userId);
    if (userMap.size === 0) {
      roomPresence.delete(roomName);
    }
    return true; // True if user is now completely offline in this room
  } else {
    userMap.set(userId, currentCount - 1);
    return false;
  }
}

function getOnlineUsersInRoom(roomName) {
  if (!roomPresence.has(roomName)) return [];
  return Array.from(roomPresence.get(roomName).keys());
}

/**
 * Initializes Socket.IO event handlers and authentication middleware for real-time messaging,
 * presence tracking, notifications, and typing indicators.
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
    const userId = socket.user._id.toString();

    // Auto-join personal user room for direct notifications and status updates
    socket.join(`user_${userId}`);
    console.log(`Socket connected: ${socket.user.name} (${userId})`);

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

        // Presence tracking: add user to room and notify other participants
        const isNewlyOnline = addUserToRoom(roomName, userId);
        if (isNewlyOnline) {
          socket.to(roomName).emit('user_online', { applicationId, userId });
        }

        const onlineUserIds = getOnlineUsersInRoom(roomName);

        const successPayload = {
          success: true,
          applicationId,
          room: roomName,
          user: { id: socket.user._id, name: socket.user.name, role: socket.user.role },
          onlineUserIds,
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
        const roomName = `application_${applicationId}`;
        if (socket.rooms.has(roomName)) {
          const isNowOffline = removeUserFromRoom(roomName, userId);
          if (isNowOffline) {
            socket.to(roomName).emit('user_offline', { applicationId, userId });
          }
          socket.leave(roomName);
          socket.emit('left_room', { applicationId });
          if (typeof callback === 'function') callback({ success: true, applicationId });
        }
      }
    });

    // Typing indicators (relay only if joined to that application room)
    socket.on('typing', (data) => {
      const applicationId = typeof data === 'string' ? data : data?.applicationId;
      if (!applicationId) return;
      const roomName = `application_${applicationId}`;
      if (socket.rooms.has(roomName)) {
        socket.to(roomName).emit('typing', {
          applicationId,
          userId,
          name: socket.user.name,
        });
      }
    });

    socket.on('stop_typing', (data) => {
      const applicationId = typeof data === 'string' ? data : data?.applicationId;
      if (!applicationId) return;
      const roomName = `application_${applicationId}`;
      if (socket.rooms.has(roomName)) {
        socket.to(roomName).emit('stop_typing', {
          applicationId,
          userId,
          name: socket.user.name,
        });
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

        if (text.trim().length > 2000) {
          const errPayload = { message: 'Message text cannot exceed 2000 characters' };
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

    // Handle disconnecting: emit user_offline to all application rooms
    socket.on('disconnecting', () => {
      for (const roomName of socket.rooms) {
        if (roomName.startsWith('application_')) {
          const appId = roomName.replace('application_', '');
          const isNowOffline = removeUserFromRoom(roomName, userId);
          if (isNowOffline) {
            socket.to(roomName).emit('user_offline', { applicationId: appId, userId });
          }
        }
      }
    });

    // Handle complete disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name} (${userId})`);
    });
  });
};

module.exports = initChatSocket;
