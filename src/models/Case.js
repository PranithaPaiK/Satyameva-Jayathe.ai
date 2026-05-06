const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * Case Schema
 * Defines the case model with comprehensive case management
 */
const caseSchema = new mongoose.Schema({
  // Case Identification
  caseId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return require('../utils/helpers').generateCaseId('CASE');
    }
  },
  title: {
    type: String,
    required: [true, 'Case title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Case description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Case Classification
  caseType: {
    type: String,
    required: true,
    enum: {
      values: ['civil', 'criminal', 'family', 'corporate', 'property', 'tax', 'labour', 'constitutional', 'other'],
      message: 'Invalid case type'
    }
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ['dispute', 'complaint', 'appeal', 'petition', 'suit', 'application', 'other'],
      message: 'Invalid case category'
    }
  },
  subcategory: {
    type: String,
    required: false
  },
  
  // Parties Involved
  plaintiff: {
    name: { type: String, required: true },
    type: { type: String, enum: ['individual', 'organization'], required: true },
    contact: {
      email: String,
      phone: String,
      address: String
    },
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  defendant: {
    name: { type: String, required: true },
    type: { type: String, enum: ['individual', 'organization'], required: true },
    contact: {
      email: String,
      phone: String,
      address: String
    },
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Judicial Assignment
  assignedJudge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courtRoom: {
    type: String,
    required: true
  },
  jurisdiction: {
    type: String,
    required: true
  },
  
  // Case Status
  status: {
    type: String,
    required: true,
    enum: {
      values: ['filed', 'under_review', 'admitted', 'active', 'adjourned', 'pending_judgment', 'closed', 'dismissed'],
      message: 'Invalid case status'
    },
    default: 'filed'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Timeline
  filingDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  admissionDate: {
    type: Date
  },
  firstHearingDate: {
    type: Date
  },
  expectedResolutionDate: {
    type: Date
  },
  actualResolutionDate: {
    type: Date
  },
  
  // Financial Information
  courtFees: {
    amount: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' }
  },
  caseValue: {
    type: Number,
    default: 0
  },
  
  // Evidence
  evidenceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  evidenceSubmitted: {
    plaintiff: { type: Number, default: 0 },
    defendant: { type: Number, default: 0 }
  },
  
  // Hearings
  hearings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hearing'
  }],
  nextHearing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hearing'
  },
  
  // Documents
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Judgment
  judgment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judgment'
  },
  
  // Appeals
  appeals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  }],
  appealOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false }
  }],
  
  // Statistics
  totalHearings: { type: Number, default: 0 },
  adjournments: { type: Number, default: 0 },
  
  // Security and Access
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
caseSchema.virtual('caseAge').get(function() {
  return Math.floor((Date.now() - this.filingDate) / (1000 * 60 * 60 * 24));
});

caseSchema.virtual('isOverdue').get(function() {
  if (!this.expectedResolutionDate) return false;
  return new Date() > this.expectedResolutionDate && this.status !== 'closed';
});

caseSchema.virtual('duration').get(function() {
  const end = this.actualResolutionDate || new Date();
  return Math.floor((end - this.filingDate) / (1000 * 60 * 60 * 24));
});

caseSchema.virtual('pendingEvidence').get(function() {
  return this.evidenceIds.filter(evidenceId => {
    // This would be populated with actual evidence data
    return true; // Simplified for now
  }).length;
});

// Indexes
caseSchema.index({ caseId: 1 });
caseSchema.index({ status: 1 });
caseSchema.index({ assignedJudge: 1 });
caseSchema.index({ 'plaintiff.lawyerId': 1 });
caseSchema.index({ 'defendant.lawyerId': 1 });
caseSchema.index({ filingDate: -1 });
caseSchema.index({ nextHearing: 1 });
caseSchema.index({ caseType: 1, category: 1 });
caseSchema.index({ tags: 1 });

// Pre-save middleware
caseSchema.pre('save', function(next) {
  // Update case statistics
  if (this.isModified('hearings')) {
    this.totalHearings = this.hearings.length;
  }
  
  // Set expected resolution date based on case type
  if (this.isNew && !this.expectedResolutionDate) {
    const resolutionTimes = {
      'civil': 365, // 1 year
      'criminal': 180, // 6 months
      'family': 90, // 3 months
      'corporate': 365, // 1 year
      'property': 180, // 6 months
      'tax': 120, // 4 months
      'labour': 90, // 3 months
      'constitutional': 365 // 1 year
    };
    
    const days = resolutionTimes[this.caseType] || 365;
    this.expectedResolutionDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Instance methods

/**
 * Update case status
 */
caseSchema.methods.updateStatus = function(newStatus, reason = '') {
  const validTransitions = {
    'filed': ['under_review', 'dismissed'],
    'under_review': ['admitted', 'dismissed'],
    'admitted': ['active', 'dismissed'],
    'active': ['adjourned', 'pending_judgment', 'closed', 'dismissed'],
    'adjourned': ['active', 'dismissed'],
    'pending_judgment': ['closed', 'dismissed'],
    'closed': [], // Terminal state
    'dismissed': [] // Terminal state
  };
  
  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  if (newStatus === 'closed' || newStatus === 'dismissed') {
    this.actualResolutionDate = new Date();
  }
  
  if (newStatus === 'admitted' && !this.admissionDate) {
    this.admissionDate = new Date();
  }
  
  // Add note about status change
  this.notes.push({
    content: `Status changed from ${this.status} to ${newStatus}${reason ? ': ' + reason : ''}`,
    isInternal: true
  });
  
  return this.save();
};

/**
 * Add hearing to case
 */
caseSchema.methods.addHearing = function(hearingId) {
  this.hearings.push(hearingId);
  this.nextHearing = hearingId;
  return this.save();
};

/**
 * Add evidence to case
 */
caseSchema.methods.addEvidence = function(evidenceId, party) {
  this.evidenceIds.push(evidenceId);
  if (party === 'plaintiff') {
    this.evidenceSubmitted.plaintiff += 1;
  } else if (party === 'defendant') {
    this.evidenceSubmitted.defendant += 1;
  }
  return this.save();
};

/**
 * Check if user has access to this case
 */
caseSchema.methods.hasAccess = function(user) {
  // Admins have access to all cases
  if (user.role === 'admin') return true;
  
  // Assigned judge has access
  if (this.assignedJudge.toString() === user._id.toString()) return true;
  
  // Lawyers have access if they represent either party
  if (user.role === 'lawyer') {
    if (this.plaintiff.lawyerId?.toString() === user._id.toString()) return true;
    if (this.defendant.lawyerId?.toString() === user._id.toString()) return true;
  }
  
  // Citizens have access if they are a party
  if (user.role === 'citizen') {
    // This would require checking against user's profile
    // Simplified for now
    return this.isPublic || this.accessLevel === 'public';
  }
  
  // Check if user is in authorized users list
  return this.authorizedUsers.some(id => id.toString() === user._id.toString());
};

/**
 * Get case summary
 */
caseSchema.methods.getSummary = function() {
  return {
    caseId: this.caseId,
    title: this.title,
    status: this.status,
    priority: this.priority,
    caseType: this.caseType,
    filingDate: this.filingDate,
    duration: this.duration,
    totalHearings: this.totalHearings,
    nextHearing: this.nextHearing,
    isOverdue: this.isOverdue
  };
};

// Static methods

/**
 * Find cases by judge
 */
caseSchema.statics.findByJudge = function(judgeId, status = null) {
  const filter = { assignedJudge: judgeId };
  if (status) filter.status = status;
  return this.find(filter).populate('assignedJudge', 'firstName lastName email');
};

/**
 * Find cases by lawyer
 */
caseSchema.statics.findByLawyer = function(lawyerId) {
  return this.find({
    $or: [
      { 'plaintiff.lawyerId': lawyerId },
      { 'defendant.lawyerId': lawyerId }
    ]
  }).populate('assignedJudge', 'firstName lastName');
};

/**
 * Find overdue cases
 */
caseSchema.statics.findOverdue = function() {
  return this.find({
    expectedResolutionDate: { $lt: new Date() },
    status: { $nin: ['closed', 'dismissed'] }
  });
};

/**
 * Get case statistics
 */
caseSchema.statics.getStatistics = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCases: { $sum: 1 },
        activeCases: {
          $sum: { $cond: [{ $in: ['$status', ['active', 'adjourned', 'pending_judgment']] }, 1, 0] }
        },
        closedCases: {
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
        },
        dismissedCases: {
          $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
        },
        avgDuration: { $avg: '$duration' },
        overdueCases: {
          $sum: { $cond: ['$isOverdue', 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Case', caseSchema);
