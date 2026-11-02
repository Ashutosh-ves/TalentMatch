const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const Application = require('../models/Application');

// @desc    Get message history for an application
// @route   GET /api/messages/:applicationId
// @access  Private (Applicant or Opening Recruiter)
const getMessageHistory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { applicationId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format',
      });
    }

    const application = await Application.findById(applicationId).populate('openingId');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Authorization check
    const isApplicant = application.studentId.toString() === req.user._id.toString();
    const isRecruiter =
      application.openingId &&
      application.openingId.recruiterId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isRecruiter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view messages for this application',
      });
    }

    const messages = await Message.find({ applicationId })
      .populate('senderId', 'name email role')
      .sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message via REST
// @route   POST /api/messages
// @access  Private (Applicant or Opening Recruiter)
const sendMessage = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { applicationId, text } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format',
      });
    }

    const application = await Application.findById(applicationId).populate('openingId');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Authorization check
    const isApplicant = application.studentId.toString() === req.user._id.toString();
    const isRecruiter =
      application.openingId &&
      application.openingId.recruiterId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isRecruiter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to send messages for this application',
      });
    }

    const message = await Message.create({
      applicationId,
      senderId: req.user._id,
      text: text.trim(),
      timestamp: new Date(),
    });

    const populatedMessage = await Message.findById(message._id).populate(
      'senderId',
      'name email role'
    );

    // Broadcast to Socket.IO room if socket server is active
    const io = req.app.get('io');
    if (io) {
      io.to(`application_${applicationId}`).emit('receive_message', populatedMessage);
    }

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessageHistory,
  sendMessage,
};

