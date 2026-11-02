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

const Recruiter = mongoose.model('Recruiter', recruiterSchema);

module.exports = Recruiter;
