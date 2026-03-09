const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateProfile, changePassword } = require('../controllers/auth.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post('/logout', logout);
router.get('/me', verifyJWT, getMe);
router.put('/profile', verifyJWT, updateProfile);
router.put('/change-password', verifyJWT, changePassword);

module.exports = router;
