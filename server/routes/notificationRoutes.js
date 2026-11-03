const express = require('express');
const { param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

const router = express.Router();

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid notification ID format'),
];

// All routes require authentication
router.use(authMiddleware);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', idParamValidation, markAsRead);

module.exports = router;

