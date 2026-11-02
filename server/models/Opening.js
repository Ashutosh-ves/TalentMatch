const mongoose = require('mongoose');

const openingSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  requiredSkills: [{
    type: String,
  }],
  availabilityNeeds: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed'],
    default: 'draft',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index on { recruiterId, status }
openingSchema.index({ recruiterId: 1, status: 1 });

const Opening = mongoose.model('Opening', openingSchema);

module.exports = Opening;
