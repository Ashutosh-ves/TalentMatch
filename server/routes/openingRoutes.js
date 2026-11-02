const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createOpening,
  getAllOpenings,
  getMyOpenings,
  getOpeningById,
  updateOpening,
  deleteOpening,
  getOpeningRankedCandidates,
  getRecommendedOpenings,
} = require('../controllers/openingController');

const router = express.Router();

// Validation rules
const createOpeningValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array of strings'),
  body('requiredSkills.*')
    .optional()
    .isString()
    .withMessage('Each required skill must be a string'),
  body('availabilityNeeds')
    .optional()
    .isString()
    .withMessage('Availability needs must be a string'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'closed'])
    .withMessage('Status must be one of: draft, active, closed'),
];

const updateOpeningValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid opening ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array of strings'),
  body('requiredSkills.*')
    .optional()
    .isString()
    .withMessage('Each required skill must be a string'),
  body('availabilityNeeds')
    .optional()
    .isString()
    .withMessage('Availability needs must be a string'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'closed'])
    .withMessage('Status must be one of: draft, active, closed'),
];

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid opening ID format'),
];

// All routes require authentication
router.use(authMiddleware);

// Static routes before :id
router.get('/recommendations', roleMiddleware('student', 'admin'), getRecommendedOpenings);
router.get('/my', roleMiddleware.checkRole('recruiter', 'admin'), getMyOpenings);

// Collection routes
router.route('/')
  .get(getAllOpenings)
  .post(roleMiddleware('recruiter', 'admin'), createOpeningValidation, createOpening);

// Ranked candidates route
router.get('/:id/candidates', roleMiddleware('recruiter', 'admin'), idParamValidation, getOpeningRankedCandidates);

// Parameterized routes
router.route('/:id')
  .get(idParamValidation, getOpeningById)
  .put(roleMiddleware('recruiter', 'admin'), updateOpeningValidation, updateOpening)
  .delete(roleMiddleware('recruiter', 'admin'), idParamValidation, deleteOpening);

module.exports = router;
