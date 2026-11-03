const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compound index on { applicationId, timestamp }
messageSchema.index({ applicationId: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
