const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/config');
const { generateHash, generateUniqueFilename, validateFileType } = require('../utils/helpers');

/**
 * File Upload Middleware
 * Handles secure file uploads with validation and storage
 */

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    // Determine upload path based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(config.upload.path, 'evidence', 'images');
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = path.join(config.upload.path, 'evidence', 'videos');
    } else if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
      uploadPath = path.join(config.upload.path, 'evidence', 'documents');
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath = path.join(config.upload.path, 'audio');
    } else {
      uploadPath = path.join(config.upload.path, 'evidence', 'other');
    }
    
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Determine file category
  let category;
  if (file.mimetype.startsWith('image/')) {
    category = 'image';
  } else if (file.mimetype.startsWith('video/')) {
    category = 'video';
  } else if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
    category = 'document';
  } else if (file.mimetype.startsWith('audio/')) {
    category = 'audio';
  } else {
    category = 'other';
  }
  
  // Validate file type
  if (category !== 'other' && validateFileType(file.mimetype, category)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images, videos, documents, audio`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
    files: 10 // Maximum 10 files at once
  }
});

/**
 * Middleware to process uploaded files and add metadata
 */
const processUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    const processedFiles = [];
    
    for (const file of req.files) {
      // Generate file hash
      const fileBuffer = require('fs').readFileSync(file.path);
      const fileHash = generateHash(fileBuffer);
      
      // Add file metadata to request
      processedFiles.push({
        ...file,
        hash: fileHash,
        size: file.size,
        uploadedAt: new Date()
      });
    }
    
    req.processedFiles = processedFiles;
    next();
  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing uploaded files',
      error: error.message
    });
  }
};

/**
 * Evidence upload middleware
 */
const uploadEvidence = upload.array('evidence', 10);

/**
 * Document upload middleware
 */
const uploadDocuments = upload.array('documents', 5);

/**
 * Audio recording upload middleware
 */
const uploadAudio = upload.single('audio');

/**
 * Profile picture upload middleware
 */
const uploadAvatar = upload.single('avatar');

/**
 * Voice recording upload with specific configuration
 */
const uploadVoiceRecording = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(config.upload.path, 'audio');
      const fs = require('fs');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const extension = file.originalname.split('.').pop();
      cb(null, `voice_${timestamp}_${random}.${extension}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    // Only allow audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed for voice recordings'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for audio files
    files: 1
  }
});

/**
 * Cleanup uploaded files on error
 */
const cleanupOnError = (error, req, res, next) => {
  if (req.files && req.files.length > 0) {
    const fs = require('fs');
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
  next(error);
};

/**
 * Validate uploaded files for evidence
 */
const validateEvidenceFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded',
      code: 'NO_FILES'
    });
  }
  
  // Check for required fields
  const { caseId, title, category } = req.body;
  
  if (!caseId || !title || !category) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: caseId, title, category',
      code: 'MISSING_FIELDS'
    });
  }
  
  // Validate category
  const validCategories = ['document', 'image', 'video', 'audio', 'digital', 'physical', 'other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category. Must be one of: ' + validCategories.join(', '),
      code: 'INVALID_CATEGORY'
    });
  }
  
  next();
};

/**
 * Generate file metadata
 */
const generateFileMetadata = (file, additionalData = {}) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    hash: file.hash,
    storagePath: file.path,
    storageUrl: `/uploads/${file.filename}`,
    uploadedAt: new Date(),
    ...additionalData
  };
};

module.exports = {
  uploadEvidence,
  uploadDocuments,
  uploadAudio,
  uploadAvatar,
  uploadVoiceRecording,
  processUpload,
  cleanupOnError,
  validateEvidenceFiles,
  generateFileMetadata
};
