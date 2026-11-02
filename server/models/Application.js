const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  openingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opening',
    required: true,
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'accepted', 'rejected'],
    default: 'applied',
    required: true,
  },
  matchScore: {
    type: Number,
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
