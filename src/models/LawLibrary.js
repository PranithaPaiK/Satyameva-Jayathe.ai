const mongoose = require('mongoose');

/**
 * Law Library Schema
 * Defines the law database with acts, sections, and legal descriptions
 */
const lawLibrarySchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Law title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  sectionNumber: {
    type: String,
    required: [true, 'Section number is required'],
    trim: true
  },
  actName: {
    type: String,
    required: [true, 'Act name is required'],
    trim: true,
    maxlength: [200, 'Act name cannot exceed 200 characters']
  },
  actDescription: {
    type: String,
    trim: true,
    maxlength: [1000, 'Act description cannot exceed 1000 characters']
  },
  
  // Classification
  category: {
    type: String,
    required: true,
    enum: {
      values: ['criminal', 'civil', 'family', 'property', 'tax', 'labour', 'constitutional', 'corporate', 'other'],
      message: 'Invalid law category'
    }
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Legal Content
  content: {
    type: String,
    required: [true, 'Law content is required'],
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  simplifiedExplanation: {
    type: String,
    maxlength: [2000, 'Simplified explanation cannot exceed 2000 characters']
  },
  keyPoints: [{
    type: String,
    maxlength: [300, 'Key point cannot exceed 300 characters']
  }],
  
  // Search and Classification
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  
  // Legal References
  citations: [{
    type: String,
    trim: true
  }],
  relatedLaws: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawLibrary'
  }],
  precedentCases: [{
    caseName: String,
    citation: String,
    year: Number,
    summary: String
  }],
  
  // Jurisdiction and Applicability
  jurisdiction: {
    type: String,
    default: 'India',
    enum: ['India', 'State', 'Central', 'International']
  },
  stateApplicability: [{
    type: String,
    trim: true
  }],
  effectiveDate: {
    type: Date
  },
  amendmentHistory: [{
    date: Date,
    description: String,
    amendmentType: {
      type: String,
      enum: ['addition', 'modification', 'repeal']
    }
  }],
  
  // Penalties and Remedies
  penalties: [{
    type: {
      type: String,
      enum: ['fine', 'imprisonment', 'community_service', 'probation', 'other']
    },
    description: String,
    minimum: Number,
    maximum: Number,
    unit: String
  }],
  remedies: [{
    type: String,
    description: String,
    conditions: String
  }],
  
  // Metadata
  source: {
    type: String,
    trim: true
  },
  lastAmended: {
    type: Date
  },
  isValid: {
    type: Boolean,
    default: true
  },
  repealed: {
    type: Boolean,
    default: false
  },
  repealedDate: Date,
  repealedBy: String,
  
  // Analytics
  metadata: {
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewed: {
      type: Date
    },
    searchCount: {
      type: Number,
      default: 0
    },
    lastSearched: {
      type: Date
    },
    relevanceScore: {
      type: Number,
      default: 0
    }
  },
  
  // Content Management
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
lawLibrarySchema.virtual('isCurrent').get(function() {
  if (this.repealed) return false;
  if (this.effectiveDate && this.effectiveDate > new Date()) return false;
  return true;
});

lawLibrarySchema.virtual('age').get(function() {
  const start = this.effectiveDate || this.createdAt;
  return Math.floor((Date.now() - start) / (365.25 * 24 * 60 * 60 * 1000));
});

lawLibrarySchema.virtual('hasPenalties').get(function() {
  return this.penalties && this.penalties.length > 0;
});

lawLibrarySchema.virtual('hasRemedies').get(function() {
  return this.remedies && this.remedies.length > 0;
});

// Indexes for search optimization
lawLibrarySchema.index({ title: 'text', content: 'text', keywords: 'text' });
lawLibrarySchema.index({ category: 1 });
lawLibrarySchema.index({ actName: 1 });
lawLibrarySchema.index({ sectionNumber: 1 });
lawLibrarySchema.index({ 'metadata.viewCount': -1 });
lawLibrarySchema.index({ isValid: 1, repealed: 1 });
lawLibrarySchema.index({ keywords: 1 });
lawLibrarySchema.index({ tags: 1 });

// Pre-save middleware
lawLibrarySchema.pre('save', function(next) {
  // Generate keywords from title and content
  if (this.isModified('title') || this.isModified('content')) {
    const natural = require('natural');
    const tokenizer = new natural.WordTokenizer();
    
    const text = `${this.title} ${this.content}`;
    const tokens = tokenizer.tokenize(text.toLowerCase());
    
    // Remove stop words and create keywords
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
    
    const keywords = tokens
      .filter(token => token.length > 2 && !stopWords.has(token))
      .filter((token, index, arr) => arr.indexOf(token) === index) // Remove duplicates
      .slice(0, 20); // Limit to 20 keywords
    
    this.keywords = keywords;
  }
  
  // Update last amended date if content changed
  if (this.isModified('content') && !this.isNew) {
    this.lastAmended = new Date();
  }
  
  next();
});

// Instance methods

/**
 * Increment view count
 */
lawLibrarySchema.methods.incrementViewCount = function() {
  this.metadata.viewCount += 1;
  this.metadata.lastViewed = new Date();
  return this.save();
};

/**
 * Increment search count
 */
lawLibrarySchema.methods.incrementSearchCount = function() {
  this.metadata.searchCount += 1;
  this.metadata.lastSearched = new Date();
  return this.save();
};

/**
 * Check if law applies to specific state
 */
lawLibrarySchema.methods.appliesToState = function(state) {
  if (this.jurisdiction === 'India' || this.jurisdiction === 'Central') {
    return true;
  }
  return this.stateApplicability.includes(state);
};

/**
 * Get simplified explanation
 */
lawLibrarySchema.methods.getSimplifiedExplanation = function() {
  if (this.simplifiedExplanation) {
    return this.simplifiedExplanation;
  }
  
  // Generate basic simplified explanation
  const categoryExplanations = {
    'criminal': 'This criminal law defines offenses and their punishments to maintain public order and safety.',
    'civil': 'This civil law resolves disputes between individuals or organizations through legal remedies.',
    'family': 'This family law governs marriage, divorce, child custody, and other family-related matters.',
    'property': 'This property law defines rights and responsibilities regarding ownership and transfer of property.',
    'tax': 'This tax law specifies tax obligations and procedures for individuals and businesses.',
    'labour': 'This labour law protects workers\' rights and regulates employment relationships.',
    'constitutional': 'This constitutional law defines fundamental rights and government structure.',
    'corporate': 'This corporate law regulates the formation and operation of companies and businesses.'
  };
  
  return categoryExplanations[this.category] || 
         'This legal provision establishes rules and regulations for maintaining justice and order in society.';
};

// Static methods

/**
 * Search laws by text
 */
lawLibrarySchema.statics.searchText = function(query, options = {}) {
  const { category, actName, limit = 20, skip = 0 } = options;
  
  let searchQuery = {
    $text: { $search: query },
    isValid: true,
    repealed: false
  };
  
  if (category) searchQuery.category = category;
  if (actName) searchQuery.actName = new RegExp(actName, 'i');
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

/**
 * Find laws by category
 */
lawLibrarySchema.statics.findByCategory = function(category, options = {}) {
  const { limit = 50, skip = 0, sortBy = 'sectionNumber' } = options;
  
  return this.find({ 
    category, 
    isValid: true, 
    repealed: false 
  })
  .sort({ [sortBy]: 1 })
  .limit(limit)
  .skip(skip);
};

/**
 * Find laws by act
 */
lawLibrarySchema.statics.findByAct = function(actName, options = {}) {
  const { limit = 100, skip = 0 } = options;
  
  return this.find({ 
    actName: new RegExp(actName, 'i'),
    isValid: true,
    repealed: false 
  })
  .sort({ sectionNumber: 1 })
  .limit(limit)
  .skip(skip);
};

/**
 * Get popular laws
 */
lawLibrarySchema.statics.getPopular = function(limit = 20) {
  return this.find({ 
    isValid: true, 
    repealed: false 
  })
  .sort({ 'metadata.viewCount': -1 })
  .limit(limit);
};

/**
 * Get law statistics
 */
lawLibrarySchema.statics.getStatistics = function() {
  return this.aggregate([
    { $match: { isValid: true, repealed: false } },
    {
      $group: {
        _id: null,
        totalLaws: { $sum: 1 },
        categoryBreakdown: {
          $push: {
            category: '$category',
            count: 1
          }
        },
        totalViews: { $sum: '$metadata.viewCount' },
        totalSearches: { $sum: '$metadata.searchCount' },
        actsCount: { $addToSet: '$actName' }
      }
    },
    {
      $project: {
        totalLaws: 1,
        totalViews: 1,
        totalSearches: 1,
        totalActs: { $size: '$actsCount' },
        categories: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$categoryBreakdown', []] },
              as: 'cat',
              in: {
                k: '$$cat.category',
                v: { $sum: { $cond: [{ $eq: ['$categoryBreakdown.category', '$$cat.category'] }, '$categoryBreakdown.count', 0] } }
              }
            }
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('LawLibrary', lawLibrarySchema);
