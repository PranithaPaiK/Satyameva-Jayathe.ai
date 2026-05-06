const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Voice Recording Schema
 * Defines voice recording storage with speech-to-text transcription
 */
const voiceRecordingSchema = new mongoose.Schema({
  // Recording Identification
  recordingId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return require('../utils/helpers').generateEvidenceId('VR');
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
    required: true,
    default: 'audio/wav'
  },
  size: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    required: true
  },
  sampleRate: {
    type: Number,
    required: true,
    default: 16000
  },
  channels: {
    type: Number,
    required: true,
    default: 1
  },
  
  // Storage Information
  storageUrl: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true,
    index: true
  },
  
  // Recording Context
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  hearingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hearing'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  speakerRole: {
    type: String,
    enum: ['judge', 'lawyer', 'plaintiff', 'defendant', 'witness', 'other'],
    required: true
  },
  speakerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Recording Metadata
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Timestamps
  recordedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  uploadedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Transcription
  transcription: {
    text: {
      type: String,
      default: ''
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    language: {
      type: String,
      default: 'en-US'
    },
    processingTime: {
      type: Number, // Processing time in milliseconds
      default: 0
    },
    engine: {
      type: String,
      default: 'browser' // browser, google, aws, azure
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    error: {
      type: String,
      default: ''
    }
  },
  
  // Speech Analysis
  analysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    emotion: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'fear', 'surprise', 'neutral'],
      default: 'neutral'
    },
    keywords: [{
      word: String,
      confidence: Number,
      timestamp: Number // Position in audio
    }],
    entities: [{
      text: String,
      type: String, // PERSON, ORGANIZATION, LOCATION, etc.
      confidence: Number,
      timestamp: Number
    }],
    contradictions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence'
    }],
    contradictionScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  
  // Quality Metrics
  quality: {
    signalToNoiseRatio: {
      type: Number,
      min: 0,
      default: 0
    },
    clarity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    volume: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    backgroundNoise: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
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
  
  // Processing Status
  processingStatus: {
    transcription: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    analysis: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    contradiction: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
voiceRecordingSchema.virtual('isTranscribed').get(function() {
  return this.transcription.status === 'completed' && this.transcription.text.length > 0;
});

voiceRecordingSchema.virtual('isAnalyzed').get(function() {
  return this.processingStatus.analysis === 'completed';
});

voiceRecordingSchema.virtual('hasContradictions').get(function() {
  return this.analysis.contradictions.length > 0 || this.analysis.contradictionScore > 0.5;
});

// Indexes
voiceRecordingSchema.index({ recordingId: 1 });
voiceRecordingSchema.index({ caseId: 1 });
voiceRecordingSchema.index({ recordedBy: 1 });
voiceRecordingSchema.index({ recordedAt: -1 });
voiceRecordingSchema.index({ speakerRole: 1 });
voiceRecordingSchema.index({ 'transcription.status': 1 });
voiceRecordingSchema.index({ isActive: 1, isArchived: 1 });

// Instance methods

/**
 * Update transcription
 */
voiceRecordingSchema.methods.updateTranscription = function(text, confidence, engine = 'browser') {
  this.transcription.text = text;
  this.transcription.confidence = confidence;
  this.transcription.engine = engine;
  this.transcription.status = 'completed';
  this.transcription.processingTime = Date.now() - this.uploadedAt.getTime();
  
  return this.save();
};

/**
 * Mark transcription as failed
 */
voiceRecordingSchema.methods.markTranscriptionFailed = function(error) {
  this.transcription.status = 'failed';
  this.transcription.error = error;
  return this.save();
};

/**
 * Update analysis results
 */
voiceRecordingSchema.methods.updateAnalysis = function(analysisResults) {
  this.analysis = {
    ...this.analysis,
    ...analysisResults
  };
  this.processingStatus.analysis = 'completed';
  return this.save();
};

/**
 * Check for contradictions
 */
voiceRecordingSchema.methods.checkContradictions = async function() {
  if (!this.isTranscribed) {
    throw new Error('Cannot check contradictions without transcription');
  }
  
  // This would implement actual contradiction checking logic
  // For now, simulate finding contradictions
  const hasContradiction = Math.random() > 0.7;
  
  if (hasContradiction) {
    this.analysis.contradictionScore = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
    this.processingStatus.contradiction = 'completed';
  } else {
    this.analysis.contradictionScore = 0;
    this.processingStatus.contradiction = 'completed';
  }
  
  return this.save();
};

/**
 * Check if user has access
 */
voiceRecordingSchema.methods.hasAccess = function(user, requiredPermission = 'view') {
  // Recorder has full access
  if (this.recordedBy.toString() === user._id.toString()) return true;
  
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

// Static methods

/**
 * Find recordings by case
 */
voiceRecordingSchema.statics.findByCase = function(caseId, filter = {}) {
  return this.find({ caseId, ...filter, isActive: true, isArchived: false });
};

/**
 * Find recordings by speaker
 */
voiceRecordingSchema.statics.findBySpeaker = function(speakerId) {
  return this.find({ speakerId, isActive: true, isArchived: false });
};

/**
 * Find recordings needing processing
 */
voiceRecordingSchema.statics.findPendingProcessing = function(type = 'transcription') {
  const statusField = `processingStatus.${type}`;
  return this.find({ 
    [statusField]: 'pending',
    isActive: true,
    isArchived: false
  });
};

/**
 * Search recordings
 */
voiceRecordingSchema.statics.search = function(query, filters = {}) {
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
        { 'transcription.text': { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    });
  }
  
  return this.find(searchQuery).populate('recordedBy', 'firstName lastName');
};

/**
 * Get recording statistics
 */
voiceRecordingSchema.statics.getStatistics = function(filter = {}) {
  return this.aggregate([
    { $match: { ...filter, isActive: true, isArchived: false } },
    {
      $group: {
        _id: null,
        totalRecordings: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' },
        transcribedCount: {
          $sum: { $cond: [{ $eq: ['$transcription.status', 'completed'] }, 1, 0] }
        },
        analyzedCount: {
          $sum: { $cond: [{ $eq: ['$processingStatus.analysis', 'completed'] }, 1, 0] }
        },
        bySpeakerRole: {
          $push: {
            role: '$speakerRole',
            count: 1
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('VoiceRecording', voiceRecordingSchema);
