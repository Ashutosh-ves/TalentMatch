const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  applyToOpening,
  getMyApplications,
  getApplicationsByOpening,
  getApplicationById,
  updateApplicationStatus,
  shortlistApplication,
  acceptApplication,
  rejectApplication,
} = require('../controllers/applicationController');

const router = express.Router();

// Validation rules
const applyValidation = [
  body('openingId')
    .isMongoId()
    .withMessage('Valid opening ID is required'),
];

const updateStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid application ID format'),
  body('status')
    .isIn(['applied', 'shortlisted', 'accepted', 'rejected'])
    .withMessage('Status must be one of: applied, shortlisted, accepted, rejected'),
];

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid application ID format'),
];

const openingIdParamValidation = [
  param('openingId')
    .isMongoId()
    .withMessage('Invalid opening ID format'),
];

// All routes require authentication
router.use(authMiddleware);

// Student routes
router.post('/', roleMiddleware('student', 'admin'), applyValidation, applyToOpening);
router.get('/my', roleMiddleware('student', 'admin'), getMyApplications);

// Recruiter opening applications route
router.get('/opening/:openingId', roleMiddleware('recruiter', 'admin'), openingIdParamValidation, getApplicationsByOpening);

// Single application details
router.get('/:id', idParamValidation, getApplicationById);

// Recruiter status actions
router.patch('/:id/status', roleMiddleware('recruiter', 'admin'), updateStatusValidation, updateApplicationStatus);
router.patch('/:id/shortlist', roleMiddleware('recruiter', 'admin'), idParamValidation, shortlistApplication);
router.patch('/:id/accept', roleMiddleware('recruiter', 'admin'), idParamValidation, acceptApplication);
router.patch('/:id/reject', roleMiddleware('recruiter', 'admin'), idParamValidation, rejectApplication);

module.exports = router;
