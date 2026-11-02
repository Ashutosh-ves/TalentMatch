const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createRecruiterProfile,
  getMyRecruiterProfile,
  getRecruiterById,
  getAllRecruiters,
  updateRecruiterProfile,
  deleteRecruiterProfile,
} = require('../controllers/recruiterController');

const router = express.Router();

// Validation rules
const profileValidation = [
  body('companyName')
    .optional()
    .isString()
    .withMessage('Company name must be a string'),
  body('websiteUrl')
    .optional()
    .isString()
    .withMessage('Website URL must be a string'),
];

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

// All recruiter profile routes are protected by authMiddleware
router.use(authMiddleware);

// Static / 'me' routes first
router.get('/me', roleMiddleware.checkRole('recruiter', 'admin'), getMyRecruiterProfile);
router.put('/me', roleMiddleware.checkRole('recruiter', 'admin'), profileValidation, updateRecruiterProfile);
router.delete('/me', roleMiddleware.checkRole('recruiter', 'admin'), deleteRecruiterProfile);

// Collection routes
router.route('/')
  .get(getAllRecruiters)
  .post(roleMiddleware.checkRole('recruiter', 'admin'), profileValidation, createRecruiterProfile);

// Parameterized routes
router.route('/:id')
  .get(idParamValidation, getRecruiterById)
  .put(roleMiddleware.checkRole('recruiter', 'admin'), idParamValidation, profileValidation, updateRecruiterProfile)
  .delete(roleMiddleware.checkRole('recruiter', 'admin'), idParamValidation, deleteRecruiterProfile);

module.exports = router;
