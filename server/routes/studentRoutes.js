const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createStudentProfile,
  getMyStudentProfile,
  getStudentById,
  getAllStudents,
  updateStudentProfile,
  deleteStudentProfile,
  syncGithubStats,
} = require('../controllers/studentController');

const router = express.Router();

// Validation rules
const profileValidation = [
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
  body('skills.*')
    .optional()
    .isString()
    .withMessage('Each skill must be a string'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array of strings'),
  body('interests.*')
    .optional()
    .isString()
    .withMessage('Each interest must be a string'),
  body('availability')
    .optional()
    .isString()
    .withMessage('Availability must be a string'),
  body('githubUsername')
    .optional()
    .isString()
    .withMessage('GitHub username must be a string'),
  body('githubStats')
    .optional()
    .isObject()
    .withMessage('GitHub stats must be an object'),
  body('linkedinUrl')
    .optional()
    .isString()
    .withMessage('LinkedIn URL must be a string'),
  body('portfolioUrl')
    .optional()
    .isString()
    .withMessage('Portfolio URL must be a string'),
];

const syncGithubValidation = [
  body('githubUsername')
    .optional()
    .isString()
    .withMessage('GitHub username must be a string'),
];

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

// All student profile routes are protected by authMiddleware
router.use(authMiddleware);

// Static / 'me' routes first
router.get('/me', roleMiddleware('student', 'admin'), getMyStudentProfile);
router.put('/me', roleMiddleware('student', 'admin'), profileValidation, updateStudentProfile);
router.delete('/me', roleMiddleware('student', 'admin'), deleteStudentProfile);
router.post('/sync-github', roleMiddleware('student', 'admin'), syncGithubValidation, syncGithubStats);

// Collection routes
router.route('/')
  .get(getAllStudents)
  .post(roleMiddleware('student', 'admin'), profileValidation, createStudentProfile);

// Parameterized routes
router.route('/:id')
  .get(idParamValidation, getStudentById)
  .put(roleMiddleware('student', 'admin'), idParamValidation, profileValidation, updateStudentProfile)
  .delete(roleMiddleware('student', 'admin'), idParamValidation, deleteStudentProfile);

module.exports = router;
