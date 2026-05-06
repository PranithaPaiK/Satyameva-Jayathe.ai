const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { auditLogger } = require('../utils/logger');

/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

/**
 * Verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password -otpSecret');
    
    if (!user) {
      auditLogger.security('Invalid token user', 'high', {
        token: token.substring(0, 20) + '...',
        userId: decoded.id
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user is active and not suspended
    if (!user.isActive || user.isSuspended) {
      auditLogger.auth('login_blocked', user._id, {
        reason: user.isSuspended ? 'account_suspended' : 'account_inactive',
        isActive: user.isActive,
        isSuspended: user.isSuspended
      });
      
      return res.status(403).json({
        success: false,
        message: 'Account is not active.',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    // Log successful authentication
    auditLogger.auth('token_verified', user._id, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      auditLogger.security('Invalid JWT token', 'medium', {
        error: error.message,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based access control middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      auditLogger.security('Unauthorized access attempt', 'medium', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Permission-based access control middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!req.user.canPerformAction(permission)) {
      auditLogger.security('Permission denied', 'medium', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredPermission: permission,
        ip: req.ip,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Required permission not granted.',
        code: 'PERMISSION_DENIED',
        requiredPermission: permission
      });
    }
    
    next();
  };
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token provided, but attaches user if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id).select('-password -otpSecret');
    
    if (user && user.isActive && !user.isSuspended && !user.isLocked) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Silently ignore errors for optional auth
    next();
  }
};

/**
 * Refresh token verification middleware
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    const user = await User.findById(decoded.id).select('-password -otpSecret');
    
    if (!user || !user.isActive || user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
        code: 'REFRESH_TOKEN_ERROR'
      });
    }
    
    console.error('Refresh token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      code: 'REFRESH_ERROR'
    });
  }
};

/**
 * OTP verification middleware
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { otp, userId } = req.body;
    
    if (!otp || !userId) {
      return res.status(400).json({
        success: false,
        message: 'OTP and user ID are required.',
        code: 'MISSING_OTP'
      });
    }
    
    const user = await User.findById(userId).select('+otpSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.verifyOTP(otp)) {
      auditLogger.security('Invalid OTP attempt', 'medium', {
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP.',
        code: 'INVALID_OTP'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      code: 'OTP_ERROR'
    });
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (req, res, next) => {
  // This would integrate with express-rate-limit
  // For now, we'll implement a simple in-memory rate limit
  next();
};

/**
 * Session timeout middleware
 */
const checkSessionTimeout = (req, res, next) => {
  if (req.user && req.user.lastLogin) {
    const sessionAge = Date.now() - req.user.lastLogin.getTime();
    const maxSessionAge = config.security.sessionTimeout;
    
    if (sessionAge > maxSessionAge) {
      auditLogger.auth('session_timeout', req.user._id, {
        sessionAge,
        maxSessionAge,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  optionalAuth,
  verifyRefreshToken,
  verifyOTP,
  authRateLimit,
  checkSessionTimeout
};
