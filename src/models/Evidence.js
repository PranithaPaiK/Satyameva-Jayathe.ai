const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config/config');

/**
 * Evidence Schema
 * Defines tamper-proof evidence storage with integrity verification
 */
const evidenceSchema = new mongoose.Schema({
  // Evidence Identification
  evidenceId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return require('../utils/helpers').generateEvidenceId('EV');
    }
  },
  
  // File Information
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  
  // Storage Information
  storageType: {
    type: String,
    enum: ['local', 'cloudinary', 's3'],
    default: 'local'
  },
  storageUrl: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    required: true
  },
  
  // Integrity Verification
  fileHash: {
    type: String,
    required: true,
    index: true
  },
  checksum: {
    type: String,
    required: true
  },
  digitalSignature: {
    type: String,
    required: true
  },
  
  // Metadata
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  party: {
    type: String,
    enum: ['plaintiff', 'defendant', 'court', 'other'],
    required: true
  },
  
  // Evidence Classification
  category: {
    type: String,
    enum: ['document', 'image', 'video', 'audio', 'digital', 'physical', 'other'],
    required: true
  },
  subcategory: {
    type: String,
    required: false
  },
  
  // Content Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  extractedText: {
    type: String,
    default: ''
  },
  keywords: [{
    type: String,
    trim: true
  }],
  
  // Timestamps and Verification
  uploadedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  verifiedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  
  // Verification Status
  isVerified: {
    type: Boolean,
    default: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'flagged'],
    default: 'verified'
  },
  verificationNotes: {
    type: String,
    default: ''
  },
  
  // Access Control
  isPublic: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['public', 'restricted', 'confidential'],
    default: 'restricted'
  },
  authorizedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'download', 'share'],
      default: 'view'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Chain of Custody
  chainOfCustody: [{
    action: {
      type: String,
      enum: ['uploaded', 'viewed', 'downloaded', 'shared', 'modified', 'verified'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    previousHash: {
      type: String,
      required: true
    },
    newHash: {
      type: String,
      required: true
    }
  }],
  
  // Evidence Analysis
  analysisResults: {
    contradictionCount: {
      type: Number,
      default: 0
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    authenticityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    lastAnalyzed: {
      type: Date,
      default: Date.now
    }
  },
  
  // Related Evidence
  relatedEvidence: [{
    evidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence'
    },
    relationship: {
      type: String,
      enum: ['supports', 'contradicts', 'supersedes', 'references', 'duplicates'],
      required: true
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archiveReason: {
    type: String,
    default: ''
  },
  
  // Retention
  retentionPeriod: {
    type: String,
    default: config.evidenceVault.retentionPeriod
  },
  retentionExpiresAt: {
    type: Date,
    default: function() {
      const period = this.retentionPeriod || '10y';
      const years = parseInt(period);
      return new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
evidenceSchema.virtual('fileExtension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

evidenceSchema.virtual('isExpired').get(function() {
  return new Date() > this.retentionExpiresAt;
});

evidenceSchema.virtual('daysUntilExpiry').get(function() {
  return Math.floor((this.retentionExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
});

evidenceSchema.virtual('accessCount').get(function() {
  return this.chainOfCustody.filter(entry => entry.action === 'viewed').length;
});

// Indexes
evidenceSchema.index({ evidenceId: 1 });
evidenceSchema.index({ caseId: 1 });
evidenceSchema.index({ uploadedBy: 1 });
evidenceSchema.index({ fileHash: 1 });
evidenceSchema.index({ uploadedAt: -1 });
evidenceSchema.index({ category: 1 });
evidenceSchema.index({ verificationStatus: 1 });
evidenceSchema.index({ isActive: 1, isArchived: 1 });

// Pre-save middleware
evidenceSchema.pre('save', function(next) {
  // Generate digital signature if new evidence
  if (this.isNew) {
    const signatureData = `${this.evidenceId}${this.fileHash}${this.uploadedAt.toISOString()}`;
    this.digitalSignature = crypto.createHmac('sha256', config.jwt.secret).update(signatureData).digest('hex');
    
    // Add initial chain of custody entry
    this.chainOfCustody.push({
      action: 'uploaded',
      performedBy: this.uploadedBy,
      performedAt: this.uploadedAt,
      ipAddress: '127.0.0.1', // Would be from request
      userAgent: 'System', // Would be from request
      previousHash: '',
      newHash: this.fileHash
    });
  }
  
  next();
});

// Instance methods

/**
 * Verify file integrity
 */
evidenceSchema.methods.verifyIntegrity = function() {
  // This would read the file from storage and recalculate hash
  // For now, return the stored verification status
  return {
    isValid: this.isVerified,
    hash: this.fileHash,
    verifiedAt: this.verifiedAt,
    signature: this.digitalSignature
  };
};

/**
 * Add chain of custody entry
 */
evidenceSchema.methods.addToChainOfCustody = function(action, userId, ipAddress, userAgent, notes = '') {
  const entry = {
    action,
    performedBy: userId,
    performedAt: new Date(),
    ipAddress,
    userAgent,
    notes,
    previousHash: this.fileHash,
    newHash: this.fileHash // Hash doesn't change for view/download
  };
  
  this.chainOfCustody.push(entry);
  this.lastAccessed = new Date();
  
  return this.save();
};

/**
 * Grant access to user
 */
evidenceSchema.methods.grantAccess = function(userId, permission = 'view', grantedBy) {
  // Check if user already has access
  const existingAccess = this.authorizedUsers.find(
    access => access.user.toString() === userId.toString()
  );
  
  if (existingAccess) {
    existingAccess.permission = permission;
    existingAccess.grantedAt = new Date();
    existingAccess.grantedBy = grantedBy;
  } else {
    this.authorizedUsers.push({
      user: userId,
      permission,
      grantedBy
    });
  }
  
  return this.save();
};

/**
 * Revoke access from user
 */
evidenceSchema.methods.revokeAccess = function(userId) {
  this.authorizedUsers = this.authorizedUsers.filter(
    access => access.user.toString() !== userId.toString()
  );
  return this.save();
};

/**
 * Check if user has access
 */
evidenceSchema.methods.hasAccess = function(user, requiredPermission = 'view') {
  // Owner has full access
  if (this.uploadedBy.toString() === user._id.toString()) return true;
  
  // Check authorized users
  const userAccess = this.authorizedUsers.find(
    access => access.user.toString() === user._id.toString()
  );
  
  if (!userAccess) return false;
  
  // Check permission levels
  const permissionLevels = {
    'view': 1,
    'download': 2,
    'share': 3
  };
  
  return permissionLevels[userAccess.permission] >= permissionLevels[requiredPermission];
};

/**
 * Update analysis results
 */
evidenceSchema.methods.updateAnalysis = function(results) {
  this.analysisResults = {
    ...this.analysisResults,
    ...results,
    lastAnalyzed: new Date()
  };
  return this.save();
};

/**
 * Archive evidence
 */
evidenceSchema.methods.archive = function(reason = '') {
  this.isArchived = true;
  this.archiveReason = reason;
  return this.save();
};

// Static methods

/**
 * Find evidence by case
 */
evidenceSchema.statics.findByCase = function(caseId, filter = {}) {
  return this.find({ caseId, ...filter, isActive: true, isArchived: false });
};

/**
 * Find evidence by user
 */
evidenceSchema.statics.findByUploader = function(userId) {
  return this.find({ uploadedBy: userId, isActive: true, isArchived: false });
};

/**
 * Find expired evidence
 */
evidenceSchema.statics.findExpired = function() {
  return this.find({
    retentionExpiresAt: { $lt: new Date() },
    isArchived: false
  });
};

/**
 * Search evidence
 */
evidenceSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    $and: [
      { isActive: true, isArchived: false },
      filters
    ]
  };
  
  if (query) {
    searchQuery.$and.push({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { keywords: { $in: [new RegExp(query, 'i')] } },
        { extractedText: { $regex: query, $options: 'i' } }
      ]
    });
  }
  
  return this.find(searchQuery).populate('uploadedBy', 'firstName lastName');
};

/**
 * Get evidence statistics
 */
evidenceSchema.statics.getStatistics = function(filter = {}) {
  return this.aggregate([
    { $match: { ...filter, isActive: true, isArchived: false } },
    {
      $group: {
        _id: null,
        totalEvidence: { $sum: 1 },
        byCategory: {
          $push: {
            category: '$category',
            count: 1
          }
        },
        byStatus: {
          $push: {
            status: '$verificationStatus',
            count: 1
          }
        },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' }
      }
    }
  ]);
};

module.exports = mongoose.model('Evidence', evidenceSchema);
