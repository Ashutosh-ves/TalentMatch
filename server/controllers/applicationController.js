const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const Opening = require('../models/Opening');
const Student = require('../models/Student');
const { computeMatch } = require('../services/matchService');
const { createAndEmit } = require('../services/notificationService');
const { attachCompanyName } = require('../utils/attachCompanyName');

const VALID_STATUSES = ['applied', 'shortlisted', 'accepted', 'rejected'];

// Helper to update application status with ownership verification
const updateStatusHelper = async (req, res, next, newStatus) => {
  if (!VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const application = await Application.findById(req.params.id).populate('openingId');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Check that opening exists
    if (!application.openingId) {
      return res.status(404).json({
        success: false,
        message: 'Associated opening not found',
      });
    }

    // Ownership check: logged-in user must be the recruiter who owns the opening (or admin)
    if (
      application.openingId.recruiterId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update applications for your own openings',
      });
    }

    const oldStatus = application.status;
    const isStatusChanged = oldStatus !== newStatus;

    application.status = newStatus;
    await application.save();

    const populatedApplication = await Application.findById(application._id)
      .populate('studentId', 'name email role status')
      .populate({
        path: 'openingId',
        populate: {
          path: 'recruiterId',
          select: 'name email role status',
        },
      })
      .lean();

    if (populatedApplication.openingId) {
      await attachCompanyName(populatedApplication.openingId);
    }

    // Real-time notifications and updates
    const io = req.app.get('io');
    const studentUserId = application.studentId?._id || application.studentId;
    const recruiterUserId = application.openingId?.recruiterId?._id || application.openingId?.recruiterId;
    const openingTitle = application.openingId?.title || 'an opening';

    if (isStatusChanged) {
      // 1. Notify student (shortlisted/accepted/rejected only, skip if unchanged)
      if (['shortlisted', 'accepted', 'rejected'].includes(newStatus)) {
        let notifType;
        let notifMessage;

        if (newStatus === 'shortlisted') {
          notifType = 'application_shortlisted';
          notifMessage = `Your application for "${openingTitle}" has been shortlisted!`;
        } else if (newStatus === 'accepted') {
          notifType = 'application_accepted';
          notifMessage = `Congratulations! Your application for "${openingTitle}" has been accepted!`;
        } else if (newStatus === 'rejected') {
          notifType = 'application_rejected';
          notifMessage = `Your application for "${openingTitle}" was not selected.`;
        }

        await createAndEmit(io, {
          userId: studentUserId,
          type: notifType,
          message: notifMessage,
          applicationId: application._id,
          openingId: application.openingId?._id || application.openingId,
        });
      }

      // 2. Emit 'application_updated' to student's and recruiter's user rooms
      if (io) {
        const updatePayload = {
          applicationId: application._id,
          openingId: application.openingId?._id || application.openingId,
          status: newStatus,
        };
        io.to(`user_${studentUserId}`).emit('application_updated', updatePayload);
        io.to(`user_${recruiterUserId}`).emit('application_updated', updatePayload);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Application status updated to ${newStatus}`,
      application: populatedApplication,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply to a job opening
// @route   POST /api/applications
// @access  Private (Student)
const applyToOpening = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { openingId } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(openingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opening ID format',
      });
    }

    const opening = await Opening.findById(openingId);
    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    if (opening.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply to an opening that is not active',
      });
    }

    // Prevent duplicate application
    const existingApp = await Application.findOne({
      studentId: req.user._id,
      openingId: opening._id,
    });
    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this opening',
      });
    }

    // Fetch student's profile to compute match score and breakdown
    const student = await Student.findOne({ userId: req.user._id }).lean();
    const { score: matchScore, breakdown: matchBreakdown } = computeMatch(student, opening);

    const application = await Application.create({
      studentId: req.user._id,
      openingId: opening._id,
      status: 'applied',
      matchScore,
      appliedAt: new Date(),
    });

    const populatedApp = await Application.findById(application._id)
      .populate('studentId', 'name email role status')
      .populate({
        path: 'openingId',
        populate: {
          path: 'recruiterId',
          select: 'name email role status',
        },
      })
      .lean();

    if (populatedApp.openingId) {
      await attachCompanyName(populatedApp.openingId);
    }
    populatedApp.matchBreakdown = matchBreakdown;

    // Notify recruiter and emit application_updated
    const io = req.app.get('io');
    const studentName = req.user.name || 'A candidate';
    const notifMessage = `${studentName} applied to ${opening.title}`;

    await createAndEmit(io, {
      userId: opening.recruiterId,
      type: 'application_received',
      message: notifMessage,
      applicationId: application._id,
      openingId: opening._id,
    });

    if (io) {
      const updatePayload = {
        applicationId: application._id,
        openingId: opening._id,
        status: 'applied',
      };
      io.to(`user_${req.user._id}`).emit('application_updated', updatePayload);
      io.to(`user_${opening.recruiterId}`).emit('application_updated', updatePayload);
    }

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: populatedApp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all applications submitted by the logged-in student
// @route   GET /api/applications/my
// @access  Private (Student)
const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ studentId: req.user._id })
      .populate({
        path: 'openingId',
        populate: {
          path: 'recruiterId',
          select: 'name email role status',
        },
      })
      .sort({ appliedAt: -1 })
      .lean();

    // Batched lookup of company names for all populated openings
    const openings = applications.map((a) => a.openingId).filter(Boolean);
    await attachCompanyName(openings);

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all applications for a specific opening (Recruiter - Owner)
// @route   GET /api/applications/opening/:openingId
// @access  Private (Approved Recruiter - Owner)
const getApplicationsByOpening = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { openingId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(openingId)) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    const opening = await Opening.findById(openingId);
    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    // Ownership check
    if (opening.recruiterId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view applications for your own openings',
      });
    }

    const applications = await Application.find({ openingId: opening._id })
      .populate('studentId', 'name email role status')
      .populate({
        path: 'openingId',
        populate: {
          path: 'recruiterId',
          select: 'name email role status',
        },
      })
      .sort({ matchScore: -1, appliedAt: -1 })
      .lean();

    const openings = applications.map((a) => a.openingId).filter(Boolean);
    await attachCompanyName(openings);

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single application by ID
// @route   GET /api/applications/:id
// @access  Private (Applicant or Opening Owner)
const getApplicationById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('studentId', 'name email role status')
      .populate({
        path: 'openingId',
        populate: {
          path: 'recruiterId',
          select: 'name email role status',
        },
      })
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Scoping check: applicant or recruiter who owns the opening
    const applicantId = application.studentId?._id || application.studentId;
    const isApplicant = applicantId.toString() === req.user._id.toString();
    const isOwner =
      application.openingId &&
      (application.openingId.recruiterId?._id || application.openingId.recruiterId).toString() ===
        req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this application',
      });
    }

    // Recompute live score and breakdown from student's current profile
    const studentProfile = await Student.findOne({ userId: applicantId }).lean();
    const { score: liveScore, breakdown: matchBreakdown } = computeMatch(
      studentProfile,
      application.openingId
    );

    application.matchScore = liveScore;
    application.matchBreakdown = matchBreakdown;

    // Attach companyName to populated opening
    if (application.openingId) {
      await attachCompanyName(application.openingId);
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application status (Recruiter - Owner)
// @route   PATCH /api/applications/:id/status
// @access  Private (Approved Recruiter - Owner)
const updateApplicationStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { status } = req.body;
  return updateStatusHelper(req, res, next, status);
};

// @desc    Shortlist candidate (Recruiter - Owner)
// @route   PATCH /api/applications/:id/shortlist
// @access  Private (Approved Recruiter - Owner)
const shortlistApplication = async (req, res, next) => {
  return updateStatusHelper(req, res, next, 'shortlisted');
};

// @desc    Accept candidate (Recruiter - Owner)
// @route   PATCH /api/applications/:id/accept
// @access  Private (Approved Recruiter - Owner)
const acceptApplication = async (req, res, next) => {
  return updateStatusHelper(req, res, next, 'accepted');
};

// @desc    Reject candidate (Recruiter - Owner)
// @route   PATCH /api/applications/:id/reject
// @access  Private (Approved Recruiter - Owner)
const rejectApplication = async (req, res, next) => {
  return updateStatusHelper(req, res, next, 'rejected');
};

module.exports = {
  applyToOpening,
  getMyApplications,
  getApplicationsByOpening,
  getApplicationById,
  updateApplicationStatus,
  shortlistApplication,
  acceptApplication,
  rejectApplication,
};
