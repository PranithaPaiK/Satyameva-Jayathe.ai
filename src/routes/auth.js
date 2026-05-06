const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, verifyRefreshToken, verifyOTP, authRateLimit } = require('../middleware/auth');

/**
 * Authentication Routes
 * Handles user registration, login, logout, and profile management
 */

// Apply rate limiting to auth routes
router.use(authRateLimit);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', verifyRefreshToken, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @route   POST /api/auth/generate-otp
 * @desc    Generate OTP for 2FA
 * @access  Private
 */
router.post('/generate-otp', authenticate, authController.generateOTPCode);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP
 * @access  Private
 */
router.post('/verify-otp', authenticate, authController.verifyOTPCode);

module.exports = router;
