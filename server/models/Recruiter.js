const mongoose = require('mongoose');

const recruiterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyName: {
    type: String,
  },
  websiteUrl: {
    type: String,
  },
});

// Unique index on userId
recruiterSchema.index({ userId: 1 }, { unique: true });

const Recruiter = mongoose.model('Recruiter', recruiterSchema);

module.exports = Recruiter;
