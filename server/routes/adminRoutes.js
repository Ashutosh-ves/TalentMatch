const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getPendingRecruiters,
  approveRecruiter,
  rejectRecruiter,
  updateRecruiterStatus,
} = require('../controllers/adminController');

const router = express.Router();

// Validation rules
const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

const statusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
];

// All admin routes strictly require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Pending recruiters list
router.get('/recruiters/pending', getPendingRecruiters);
router.get('/pending-recruiters', getPendingRecruiters);

// Approve and reject actions
router.patch('/recruiters/:id/approve', idParamValidation, approveRecruiter);
router.patch('/recruiters/:id/reject', idParamValidation, rejectRecruiter);
router.patch('/recruiters/:id/status', statusValidation, updateRecruiterStatus);

module.exports = router;
