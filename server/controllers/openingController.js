const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Opening = require('../models/Opening');
const Application = require('../models/Application');
const Student = require('../models/Student');
const Message = require('../models/Message');
const { computeMatch, rankCandidates, recommendOpeningsForStudent } = require('../services/matchService');
const { attachCompanyName } = require('../utils/attachCompanyName');

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

    const populatedOpening = await Opening.findById(opening._id)
      .populate('recruiterId', 'name email role status')
      .lean();

    await attachCompanyName(populatedOpening);

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
      .sort({ createdAt: -1 })
      .lean();

    await attachCompanyName(openings);

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
      .sort({ createdAt: -1 })
      .lean();

    await attachCompanyName(openings);

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

    const opening = await Opening.findById(req.params.id)
      .populate('recruiterId', 'name email role status')
      .lean();

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

    await attachCompanyName(opening);

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

    const populatedOpening = await Opening.findById(opening._id)
      .populate('recruiterId', 'name email role status')
      .lean();

    await attachCompanyName(populatedOpening);

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

    // Find associated applications
    const applications = await Application.find({ openingId: opening._id }).select('_id');
    const applicationIds = applications.map((app) => app._id);

    // Delete messages of the associated applications
    if (applicationIds.length > 0) {
      await Message.deleteMany({ applicationId: { $in: applicationIds } });
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

// @desc    Get candidates for an opening ranked by live matchScore
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

    const opening = await Opening.findById(req.params.id).lean();
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

    // Batched lookup of student profiles to avoid N+1 queries
    const studentUserIds = applications
      .map((app) => app.studentId?._id || app.studentId)
      .filter(Boolean);

    const studentProfiles = await Student.find({ userId: { $in: studentUserIds } }).lean();
    const profileMap = new Map();
    studentProfiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    // Recompute live match score, breakdown, and studentProfile summary
    for (const app of applications) {
      const studentUserId = (app.studentId?._id || app.studentId || '').toString();
      const profile = profileMap.get(studentUserId) || null;
      const { score, breakdown } = computeMatch(profile, opening);

      app.matchScore = score;
      app.matchBreakdown = breakdown;
      app.studentProfile = {
        skills: profile?.skills || [],
        availability: profile?.availability || '',
        githubStats: profile?.githubStats || { repoCount: 0, contributions: 0, topLanguages: [] },
      };
      app.studentSkills = profile?.skills || [];
    }

    // Rank candidates by live score descending
    applications.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return res.status(200).json({
      success: true,
      count: applications.length,
      candidates: applications,
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
    const student = await Student.findOne({ userId: req.user._id }).lean();

    const activeOpenings = await Opening.find({ status: 'active' })
      .populate('recruiterId', 'name email role status')
      .lean();

    const recommendations = recommendOpeningsForStudent(student, activeOpenings);
    await attachCompanyName(recommendations);

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
