const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'application_received',
      'application_shortlisted',
      'application_accepted',
      'application_rejected',
      'recruiter_approved',
      'recruiter_rejected',
    ],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
  },
  openingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opening',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for performant querying of user's unread / recent notifications
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

