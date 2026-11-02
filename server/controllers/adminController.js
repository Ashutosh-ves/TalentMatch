const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Recruiter = require('../models/Recruiter');

// Helper to resolve a User document from either User _id or Recruiter profile _id
const resolveRecruiterUser = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  let user = await User.findOne({ _id: id, role: 'recruiter' });
  if (!user) {
    const recruiterProfile = await Recruiter.findById(id);
    if (recruiterProfile) {
      user = await User.findById(recruiterProfile.userId);
    }
  }

  return user;
};

// @desc    List all recruiters with status === "pending"
// @route   GET /api/admin/recruiters/pending OR GET /api/admin/pending-recruiters
// @access  Private (Admin only)
const getPendingRecruiters = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ role: 'recruiter', status: 'pending' })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = pendingUsers.map((u) => u._id);
    const profiles = await Recruiter.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const recruiters = pendingUsers.map((user) => {
      const profile = profileMap.get(user._id.toString());
      return {
        ...user,
        companyName: profile?.companyName || '',
        websiteUrl: profile?.websiteUrl || '',
        recruiterProfileId: profile?._id || null,
      };
    });

    return res.status(200).json({
      success: true,
      count: recruiters.length,
      recruiters,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending recruiter
// @route   PATCH /api/admin/recruiters/:id/approve
// @access  Private (Admin only)
const approveRecruiter = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;

  try {
    const user = await resolveRecruiterUser(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found',
      });
    }

    user.status = 'approved';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Recruiter approved successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a recruiter
// @route   PATCH /api/admin/recruiters/:id/reject
// @access  Private (Admin only)
const rejectRecruiter = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;

  try {
    const user = await resolveRecruiterUser(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found',
      });
    }

    user.status = 'rejected';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Recruiter rejected successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recruiter status (generic)
// @route   PATCH /api/admin/recruiters/:id/status
// @access  Private (Admin only)
const updateRecruiterStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const { status } = req.body;

  try {
    const user = await resolveRecruiterUser(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found',
      });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Recruiter status updated to ${status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingRecruiters,
  approveRecruiter,
  rejectRecruiter,
  updateRecruiterStatus,
};

