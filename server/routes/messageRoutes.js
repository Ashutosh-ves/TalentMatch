const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMessageHistory,
  sendMessage,
} = require('../controllers/messageController');

const router = express.Router();

// Validation rules
const getHistoryValidation = [
  param('applicationId')
    .isMongoId()
    .withMessage('Invalid application ID format'),
];

const sendMessageValidation = [
  body('applicationId')
    .isMongoId()
    .withMessage('Valid application ID is required'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Message text cannot be empty'),
];

// All routes require authentication
router.use(authMiddleware);

router.get('/:applicationId', getHistoryValidation, getMessageHistory);
router.post('/', sendMessageValidation, sendMessage);

module.exports = router;
