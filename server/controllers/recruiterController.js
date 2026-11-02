const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Recruiter = require('../models/Recruiter');

// Helper to find recruiter by either Recruiter _id or User _id
const findRecruiterByDocOrUserId = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  let recruiter = await Recruiter.findById(id).populate('userId', 'name email role status createdAt');
  if (!recruiter) {
    recruiter = await Recruiter.findOne({ userId: id }).populate('userId', 'name email role status createdAt');
  }
  return recruiter;
};

// @desc    Create recruiter profile for current user
// @route   POST /api/recruiters
// @access  Private (Recruiter)
const createRecruiterProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    const existingProfile = await Recruiter.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Recruiter profile already exists',
      });
    }

    const { companyName, websiteUrl } = req.body;

    const recruiter = await Recruiter.create({
      userId: req.user._id,
      companyName: companyName || '',
      websiteUrl: websiteUrl || '',
    });

    const populatedRecruiter = await Recruiter.findById(recruiter._id).populate('userId', 'name email role status createdAt');

    return res.status(201).json({
      success: true,
      message: 'Recruiter profile created successfully',
      recruiter: populatedRecruiter,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current recruiter profile
// @route   GET /api/recruiters/me
// @access  Private (Recruiter)
const getMyRecruiterProfile = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ userId: req.user._id }).populate('userId', 'name email role status createdAt');
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter profile by ID (Recruiter ID or User ID)
// @route   GET /api/recruiters/:id
// @access  Private
const getRecruiterById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    const recruiter = await findRecruiterByDocOrUserId(req.params.id);
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all recruiter profiles
// @route   GET /api/recruiters
// @access  Private
const getAllRecruiters = async (req, res, next) => {
  try {
    const recruiters = await Recruiter.find().populate('userId', 'name email role status createdAt');
    return res.status(200).json({
      success: true,
      count: recruiters.length,
      recruiters,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recruiter profile (own profile only)
// @route   PUT /api/recruiters/me OR PUT /api/recruiters/:id
// @access  Private (Recruiter - Own Profile)
const updateRecruiterProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    let recruiter;

    if (req.params.id && req.params.id !== 'me') {
      recruiter = await findRecruiterByDocOrUserId(req.params.id);
      if (!recruiter) {
        return res.status(404).json({
          success: false,
          message: 'Recruiter profile not found',
        });
      }

      // Enforce scoping: user can only edit their own profile
      if (recruiter.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only edit your own profile',
        });
      }
    } else {
      recruiter = await Recruiter.findOne({ userId: req.user._id }).populate('userId', 'name email role status createdAt');
      if (!recruiter) {
        return res.status(404).json({
          success: false,
          message: 'Recruiter profile not found',
        });
      }
    }

    const { companyName, websiteUrl } = req.body;

    if (companyName !== undefined) recruiter.companyName = companyName;
    if (websiteUrl !== undefined) recruiter.websiteUrl = websiteUrl;

    await recruiter.save();

    return res.status(200).json({
      success: true,
      message: 'Recruiter profile updated successfully',
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete recruiter profile (own profile only)
// @route   DELETE /api/recruiters/me OR DELETE /api/recruiters/:id
// @access  Private (Recruiter - Own Profile)
const deleteRecruiterProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    let recruiter;

    if (req.params.id && req.params.id !== 'me') {
      recruiter = await findRecruiterByDocOrUserId(req.params.id);
      if (!recruiter) {
        return res.status(404).json({
          success: false,
          message: 'Recruiter profile not found',
        });
      }

      // Enforce scoping: user can only delete their own profile
      if (recruiter.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only delete your own profile',
        });
      }
    } else {
      recruiter = await Recruiter.findOne({ userId: req.user._id });
      if (!recruiter) {
        return res.status(404).json({
          success: false,
          message: 'Recruiter profile not found',
        });
      }
    }

    await Recruiter.findByIdAndDelete(recruiter._id);

    return res.status(200).json({
      success: true,
      message: 'Recruiter profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRecruiterProfile,
  getMyRecruiterProfile,
  getRecruiterById,
  getAllRecruiters,
  updateRecruiterProfile,
  deleteRecruiterProfile,
};

