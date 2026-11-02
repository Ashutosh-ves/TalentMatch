const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Opening = require('../models/Opening');
const Application = require('../models/Application');
const Student = require('../models/Student');
const { rankCandidates, recommendOpeningsForStudent } = require('../services/matchService');

// @desc    Create a new job opening
// @route   POST /api/openings
// @access  Private (Approved Recruiter)
const createOpening = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  try {
    const {
      title,
      description,
      requiredSkills,
      availabilityNeeds,
      status,
    } = req.body;

    const opening = await Opening.create({
      recruiterId: req.user._id,
      title,
      description: description || '',
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      availabilityNeeds: availabilityNeeds || '',
      status: status || 'draft',
    });

    const populatedOpening = await Opening.findById(opening._id).populate('recruiterId', 'name email role status');

    return res.status(201).json({
      success: true,
      message: 'Opening created successfully',
      opening: populatedOpening,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all job openings (optionally filter by status)
// @route   GET /api/openings
// @access  Private
const getAllOpenings = async (req, res, next) => {
  try {
    const query = {};

    if (req.user && req.user.role === 'student') {
      // Students may only see active openings or openings they have applied to (ignore ?status)
      const appliedOpeningIds = await Application.find({ studentId: req.user._id }).distinct('openingId');
      query.$or = [
        { status: 'active' },
        { _id: { $in: appliedOpeningIds } },
      ];
    } else {
      if (req.query.status) {
        query.status = req.query.status;
      }
    }

    const openings = await Opening.find(query)
      .populate('recruiterId', 'name email role status')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: openings.length,
      openings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get openings created by the logged-in recruiter
// @route   GET /api/openings/my
// @access  Private (Recruiter)
const getMyOpenings = async (req, res, next) => {
  try {
    const openings = await Opening.find({ recruiterId: req.user._id })
      .populate('recruiterId', 'name email role status')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: openings.length,
      openings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single opening by ID
// @route   GET /api/openings/:id
// @access  Private
const getOpeningById = async (req, res, next) => {
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
        message: 'Opening not found',
      });
    }

    const opening = await Opening.findById(req.params.id).populate('recruiterId', 'name email role status');
    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    // Students may only see openings with status "active" unless they have applied to that opening
    if (req.user && req.user.role === 'student' && opening.status !== 'active') {
      const hasApplied = await Application.exists({
        studentId: req.user._id,
        openingId: opening._id,
      });

      if (!hasApplied) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students may only view active openings or openings they have applied to',
        });
      }
    }

    return res.status(200).json({
      success: true,
      opening,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a job opening (owner only)
// @route   PUT /api/openings/:id
// @access  Private (Approved Recruiter - Owner)
const updateOpening = async (req, res, next) => {
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
        message: 'Opening not found',
      });
    }

    const opening = await Opening.findById(req.params.id);
    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    // Ownership check: must be owner or admin
    if (opening.recruiterId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own openings',
      });
    }

    const {
      title,
      description,
      requiredSkills,
      availabilityNeeds,
      status,
    } = req.body;

    if (title !== undefined) opening.title = title;
    if (description !== undefined) opening.description = description;
    if (requiredSkills !== undefined) opening.requiredSkills = requiredSkills;
    if (availabilityNeeds !== undefined) opening.availabilityNeeds = availabilityNeeds;
    if (status !== undefined) opening.status = status;

    await opening.save();

    const populatedOpening = await Opening.findById(opening._id).populate('recruiterId', 'name email role status');

    return res.status(200).json({
      success: true,
      message: 'Opening updated successfully',
      opening: populatedOpening,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a job opening (owner only)
// @route   DELETE /api/openings/:id
// @access  Private (Approved Recruiter - Owner)
const deleteOpening = async (req, res, next) => {
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
        message: 'Opening not found',
      });
    }

    const opening = await Opening.findById(req.params.id);
    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    // Ownership check: must be owner or admin
    if (opening.recruiterId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete your own openings',
      });
    }

    // Delete associated applications
    await Application.deleteMany({ openingId: opening._id });
    await Opening.findByIdAndDelete(opening._id);

    return res.status(200).json({
      success: true,
      message: 'Opening and associated applications deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidates for an opening ranked by matchScore
// @route   GET /api/openings/:id/candidates OR GET /api/openings/:id/ranked-candidates
// @access  Private (Approved Recruiter - Owner)
const getOpeningRankedCandidates = async (req, res, next) => {
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
        message: 'Opening not found',
      });
    }

    const opening = await Opening.findById(req.params.id);
    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Opening not found',
      });
    }

    // Scoping check
    if (opening.recruiterId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view candidates for your own openings',
      });
    }

    const applications = await Application.find({ openingId: opening._id })
      .populate('studentId', 'name email role status')
      .lean();

    const ranked = rankCandidates(applications);

    return res.status(200).json({
      success: true,
      count: ranked.length,
      candidates: ranked,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recommended openings for logged-in student ranked by matchScore
// @route   GET /api/openings/recommendations
// @access  Private (Student)
const getRecommendedOpenings = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    const studentSkills = student ? student.skills : [];

    const activeOpenings = await Opening.find({ status: 'active' })
      .populate('recruiterId', 'name email role status')
      .lean();

    const recommendations = recommendOpeningsForStudent(studentSkills, activeOpenings);

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOpening,
  getAllOpenings,
  getMyOpenings,
  getOpeningById,
  updateOpening,
  deleteOpening,
  getOpeningRankedCandidates,
  getRecommendedOpenings,
};

