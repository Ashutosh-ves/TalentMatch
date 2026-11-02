const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skills: [{
    type: String,
  }],
  interests: [{
    type: String,
  }],
  availability: {
    type: String,
  },
  githubUsername: {
    type: String,
  },
  githubStats: {
    contributions: {
      type: Number,
      default: 0,
    },
    topLanguages: [{
      type: String,
    }],
    repoCount: {
      type: Number,
      default: 0,
    },
  },
  linkedinUrl: {
    type: String,
  },
  portfolioUrl: {
    type: String,
  },
});

// Unique index on userId
studentSchema.index({ userId: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
