const User = require('../models/User');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const config = require('../config/config');
const { auditLogger, logger } = require('../utils/logger');
const { validateEmail, generateOTP } = require('../utils/helpers');

/**
 * Authentication Controller
 * Handles user authentication, registration, and session management
 */

/**
 * User Registration
 */
const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      barCode,
      specialization,
      experience
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Validate role-specific requirements
    if ((role === 'judge' || role === 'lawyer') && !barCode) {
      return res.status(400).json({
        success: false,
        message: 'Bar code is required for judges and lawyers',
        code: 'BAR_CODE_REQUIRED'
      });
    }

    // Create user
    const userData = {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      barCode: role === 'judge' || role === 'lawyer' ? barCode : undefined,
      specialization: specialization || [],
      experience: experience || 0
    };

    const user = new User(userData);
    await user.save();

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Remove sensitive fields
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.otpSecret;

    // Log registration
    auditLogger.auth('registration', user._id, {
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * User Login
 */
const login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    
    if (!user) {
      auditLogger.security('Login attempt with non-existent email', 'medium', {
        email,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Check if account is active
    if (!user.isActive || user.isSuspended) {
      auditLogger.auth('login_blocked', user._id, {
        reason: user.isSuspended ? 'account_suspended' : 'account_inactive',
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      
      auditLogger.security('Failed login attempt', 'medium', {
        userId: user._id,
        loginAttempts: user.loginAttempts + 1,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check OTP if required (for 2FA)
    if (user.isEmailVerified && !otp) {
      // Generate OTP for 2FA if email is verified
      const generatedOTP = user.generateOTP();
      
      // In production, send OTP via email/SMS
      console.log(`OTP for ${email}: ${generatedOTP}`);
      
      return res.status(200).json({
        success: true,
        message: 'OTP required for two-factor authentication',
        requiresOTP: true,
        code: 'OTP_REQUIRED'
      });
    }

    if (user.isEmailVerified && otp) {
      if (!user.verifyOTP(otp)) {
        auditLogger.security('Invalid OTP attempt', 'medium', {
          userId: user._id,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid OTP',
          code: 'INVALID_OTP'
        });
      }
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Remove sensitive fields
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.otpSecret;

    // Log successful login
    auditLogger.auth('login_success', user._id, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Refresh Token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user; // Set by verifyRefreshToken middleware

    // Generate new tokens
    const token = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    auditLogger.auth('token_refreshed', user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  try {
    const user = req.user;

    // In a production environment, you would:
    // 1. Add the token to a blacklist
    // 2. Clear refresh token from database
    // 3. Clear session data

    auditLogger.auth('logout', user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Get Current User Profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // Remove sensitive fields
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.otpSecret;

    res.status(200).json({
      success: true,
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

/**
 * Update Profile
 */
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Fields that can be updated
    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'address',
      'specialization',
      'experience',
      'language',
      'timezone',
      'notifications'
    ];

    // Filter updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Update user
    Object.assign(user, filteredUpdates);
    await user.save();

    // Remove sensitive fields
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.otpSecret;

    auditLogger.auth('profile_updated', user._id, {
      updatedFields: Object.keys(filteredUpdates),
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Get user with password
    const userWithPassword = await User.findById(user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      auditLogger.security('Invalid password change attempt', 'medium', {
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    userWithPassword.password = newPassword;
    await userWithPassword.save();

    auditLogger.auth('password_changed', user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

/**
 * Generate OTP for 2FA
 */
const generateOTPCode = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email must be verified first',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    const otp = user.generateOTP();
    
    // In production, send OTP via email/SMS
    console.log(`OTP for ${user.email}: ${otp}`);
    
    auditLogger.auth('otp_generated', user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      // In production, don't return the actual OTP
      otp: config.nodeEnv === 'development' ? otp : undefined
    });
  } catch (error) {
    logger.error('Generate OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate OTP',
      error: error.message
    });
  }
};

/**
 * Verify OTP
 */
const verifyOTPCode = async (req, res) => {
  try {
    const user = req.user;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
        code: 'MISSING_OTP'
      });
    }

    const isValid = user.verifyOTP(otp);
    
    if (!isValid) {
      auditLogger.security('Invalid OTP verification', 'medium', {
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP',
        code: 'INVALID_OTP'
      });
    }

    auditLogger.auth('otp_verified', user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  generateOTPCode,
  verifyOTPCode
};
