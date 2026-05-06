const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * User Schema
 * Defines the user model with authentication and role-based access
 */
const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(phone) {
        return /^[+]?[\d\s-()]+$/.test(phone);
      },
      message: 'Please provide a valid phone number'
    }
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['judge', 'lawyer', 'citizen', 'admin'],
      message: 'Role must be one of: judge, lawyer, citizen, admin'
    }
  },
  
  // Professional Information (for judges and lawyers)
  barCode: {
    type: String,
    sparse: true, // Allow null/undefined
    unique: true,
    validate: {
      validator: function(barCode) {
        return !barCode || /^[A-Z0-9]{6,12}$/.test(barCode);
      },
      message: 'Bar code must be 6-12 alphanumeric characters'
    }
  },
  specialization: {
    type: [String],
    default: []
  },
  experience: {
    type: Number,
    min: 0,
    max: 50
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(dob) {
        return !dob || dob < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    pinCode: String,
    country: { type: String, default: 'India' }
  },
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isProfileVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Security
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  otpSecret: {
    type: String,
    select: false
  },
  
  // Preferences
  language: {
    type: String,
    default: 'en'
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ barCode: 1 });
userSchema.index({ 'verificationDocuments.status': 1 });
userSchema.index({ isActive: 1, isSuspended: 1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Generate OTP secret if not exists
  if (!this.otpSecret) {
    this.otpSecret = require('speakeasy').generateSecret().base32;
  }
  
  next();
});

// Instance methods

/**
 * Compare password for authentication
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate JWT token
 */
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    fullName: this.fullName
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Generate refresh token
 */
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

/**
 * Generate OTP
 */
userSchema.methods.generateOTP = function() {
  const speakeasy = require('speakeasy');
  return speakeasy.totp({
    secret: this.otpSecret,
    encoding: 'base32',
    time: Math.floor(Date.now() / 1000),
    window: config.otp.window
  });
};

/**
 * Verify OTP
 */
userSchema.methods.verifyOTP = function(token) {
  const speakeasy = require('speakeasy');
  return speakeasy.totp.verify({
    secret: this.otpSecret,
    encoding: 'base32',
    token: token,
    window: config.otp.window
  });
};

/**
 * Increment login attempts
 */
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

/**
 * Reset login attempts
 */
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

/**
 * Check if user can perform action based on role
 */
userSchema.methods.canPerformAction = function(action) {
  const rolePermissions = {
    judge: ['view_cases', 'manage_hearings', 'write_judgments', 'access_evidence'],
    lawyer: ['view_cases', 'upload_evidence', 'manage_arguments', 'view_law_library'],
    citizen: ['view_own_cases', 'upload_documents', 'track_progress', 'access_law_library'],
    admin: ['manage_users', 'system_config', 'view_all_cases', 'manage_system']
  };
  
  return rolePermissions[this.role]?.includes(action) || false;
};

// Static methods

/**
 * Find user by email with password
 */
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email }).select('+password +otpSecret');
};

/**
 * Find active users
 */
userSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isActive: true, isSuspended: false });
};

/**
 * Find users by role
 */
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true, isSuspended: false });
};

module.exports = mongoose.model('User', userSchema);
