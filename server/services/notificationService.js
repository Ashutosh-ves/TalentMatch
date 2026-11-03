const Notification = require('../models/Notification');

/**
 * Creates and persists a notification in MongoDB, then emits it in real-time
 * to the recipient's personal socket room (`user_<userId>`).
 *
 * @param {import('socket.io').Server} [io] - Socket.io server instance
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.userId - Recipient user ID
 * @param {string} params.type - Allowed notification type enum
 * @param {string} params.message - Notification message text
 * @param {string|import('mongoose').Types.ObjectId} [params.applicationId] - Optional application reference
 * @param {string|import('mongoose').Types.ObjectId} [params.openingId] - Optional opening reference
 * @returns {Promise<import('../models/Notification')>} Saved notification document
 */
const createAndEmit = async (io, { userId, type, message, applicationId, openingId }) => {
  const notification = await Notification.create({
    userId,
    type,
    message,
    applicationId: applicationId || undefined,
    openingId: openingId || undefined,
  });

  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }

  return notification;
};

module.exports = {
  createAndEmit,
};

