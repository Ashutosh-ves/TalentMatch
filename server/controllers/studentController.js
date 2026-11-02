const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Opening = require('../models/Opening');
const { syncStudentGithubData } = require('../services/githubService');

// Helper to find student by either Student _id or User _id
const findStudentByDocOrUserId = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  let student = await Student.findById(id).populate('userId', 'name email role status createdAt');
  if (!student) {
    student = await Student.findOne({ userId: id }).populate('userId', 'name email role status createdAt');
  }
  return student;
};

// @desc    Create student profile for current user
// @route   POST /api/students
// @access  Private (Student)
const createStudentProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    const existingProfile = await Student.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Student profile already exists',
      });
    }

    const {
      skills,
      interests,
      availability,
      githubUsername,
      githubStats,
      linkedinUrl,
      portfolioUrl,
    } = req.body;

    const student = await Student.create({
      userId: req.user._id,
      skills: Array.isArray(skills) ? skills : [],
      interests: Array.isArray(interests) ? interests : [],
      availability: availability || '',
      githubUsername: githubUsername || '',
      githubStats: githubStats || { contributions: 0, topLanguages: [], repoCount: 0 },
      linkedinUrl: linkedinUrl || '',
      portfolioUrl: portfolioUrl || '',
    });

    const populatedStudent = await Student.findById(student._id).populate('userId', 'name email role status createdAt');

    return res.status(201).json({
      success: true,
      message: 'Student profile created successfully',
      student: populatedStudent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student profile
// @route   GET /api/students/me
// @access  Private (Student)
const getMyStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email role status createdAt');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student profile by ID (Student ID or User ID)
// @route   GET /api/students/:id
// @access  Private (Self, Admin, or Recruiter whose opening student applied to)
const getStudentById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    const student = await findStudentByDocOrUserId(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const studentUserId = student.userId?._id
      ? student.userId._id.toString()
      : student.userId?.toString();

    const isSelf = req.user && req.user._id.toString() === studentUserId;
    const isAdmin = req.user && req.user.role === 'admin';
    let isAuthorizedRecruiter = false;

    if (req.user && req.user.role === 'recruiter') {
      const recruiterOpeningIds = await Opening.find({ recruiterId: req.user._id }).distinct('_id');
      if (recruiterOpeningIds.length > 0) {
        const hasApplication = await Application.exists({
          studentId: studentUserId,
          openingId: { $in: recruiterOpeningIds },
        });
        if (hasApplication) {
          isAuthorizedRecruiter = true;
        }
      }
    }

    if (!isAdmin && !isSelf && !isAuthorizedRecruiter) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this student profile',
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all student profiles
// @route   GET /api/students
// @access  Private (Admin only)
const getAllStudents = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required to list student profiles',
      });
    }

    const students = await Student.find().populate('userId', 'name email role status createdAt');
    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student profile (own profile only)
// @route   PUT /api/students/me OR PUT /api/students/:id
// @access  Private (Student - Own Profile)
const updateStudentProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    let student;

    if (req.params.id && req.params.id !== 'me') {
      student = await findStudentByDocOrUserId(req.params.id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      // Enforce scoping: user can only edit their own profile
      if (student.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only edit your own profile',
        });
      }
    } else {
      student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email role status createdAt');
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }
    }

    const {
      skills,
      interests,
      availability,
      githubUsername,
      githubStats,
      linkedinUrl,
      portfolioUrl,
    } = req.body;

    if (skills !== undefined) student.skills = skills;
    if (interests !== undefined) student.interests = interests;
    if (availability !== undefined) student.availability = availability;
    if (githubUsername !== undefined) student.githubUsername = githubUsername;
    if (githubStats !== undefined) student.githubStats = githubStats;
    if (linkedinUrl !== undefined) student.linkedinUrl = linkedinUrl;
    if (portfolioUrl !== undefined) student.portfolioUrl = portfolioUrl;

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully',
      student,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student profile (own profile only)
// @route   DELETE /api/students/me OR DELETE /api/students/:id
// @access  Private (Student - Own Profile)
const deleteStudentProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    let student;

    if (req.params.id && req.params.id !== 'me') {
      student = await findStudentByDocOrUserId(req.params.id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      // Enforce scoping: user can only delete their own profile
      if (student.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only delete your own profile',
        });
      }
    } else {
      student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }
    }

    await Student.findByIdAndDelete(student._id);

    return res.status(200).json({
      success: true,
      message: 'Student profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync and cache GitHub stats for current student
// @route   POST /api/students/sync-github
// @access  Private (Student)
const syncGithubStats = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    const { githubUsername } = req.body;
    const student = await syncStudentGithubData(req.user._id, githubUsername);

    return res.status(200).json({
      success: true,
      message: 'GitHub stats synced successfully',
      student,
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  createStudentProfile,
  getMyStudentProfile,
  getStudentById,
  getAllStudents,
  updateStudentProfile,
  deleteStudentProfile,
  syncGithubStats,
};
