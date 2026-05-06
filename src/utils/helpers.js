const crypto = require('crypto');
const moment = require('moment');
const lodash = require('lodash');

/**
 * Utility helper functions for the application
 */

/**
 * Generate SHA-256 hash for file integrity
 * @param {Buffer|string} data - Data to hash
 * @returns {string} SHA-256 hash
 */
const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Format date to ISO string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  return moment(date).toISOString();
};

/**
 * Validate file type
 * @param {string} mimeType - MIME type to validate
 * @param {string} category - File category (image, video, document, audio)
 * @returns {boolean} True if valid
 */
const validateFileType = (mimeType, category) => {
  const config = require('../config/config');
  return config.upload.allowedTypes[category].includes(mimeType);
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Sanitize string for database storage
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Generate case ID
 * @param {string} type - Case type
 * @returns {string} Case ID
 */
const generateCaseId = (type = 'CASE') => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${type}/${year}/${random}`;
};

/**
 * Generate evidence ID
 * @param {string} type - Evidence type
 * @returns {string} Evidence ID
 */
const generateEvidenceId = (type = 'EV') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}_${timestamp}_${random}`;
};

/**
 * Paginate array data
 * @param {Array} data - Data to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated data
 */
const paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      totalItems: data.length,
      hasNext: endIndex < data.length,
      hasPrev: page > 1
    }
  };
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  return lodash.cloneDeep(obj);
};

/**
 * Remove sensitive fields from object
 * @param {Object} obj - Object to sanitize
 * @param {Array} fields - Fields to remove
 * @returns {Object} Sanitized object
 */
const removeSensitiveFields = (obj, fields = ['password', 'token', 'secret']) => {
  const cloned = deepClone(obj);
  fields.forEach(field => delete cloned[field]);
  return cloned;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate OTP
 * @param {number} length - OTP length
 * @returns {string} OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

/**
 * Check if date is within range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} True if within range
 */
const isDateInRange = (date, startDate, endDate) => {
  return moment(date).isBetween(startDate, endDate, null, '[]');
};

/**
 * Calculate age from birth date
 * @param {Date} birthDate - Birth date
 * @returns {number} Age in years
 */
const calculateAge = (birthDate) => {
  return moment().diff(birthDate, 'years');
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const name = originalName.split('.').slice(0, -1).join('.');
  return `${name}_${timestamp}_${random}.${extension}`;
};

/**
 * Extract text from file (simplified implementation)
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @returns {string} Extracted text
 */
const extractTextFromFile = async (buffer, mimeType) => {
  // This is a simplified implementation
  // In production, you would use appropriate libraries for different file types
  
  switch (mimeType) {
    case 'text/plain':
      return buffer.toString('utf8');
    case 'application/pdf':
      // Use pdf-parse library for PDF files
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        return data.text;
      } catch (error) {
        console.error('Error parsing PDF:', error);
        return '';
      }
    default:
      return '';
  }
};

/**
 * Search text with highlighting
 * @param {string} text - Text to search
 * @param {string} query - Search query
 * @returns {Object} Search result with highlighted text
 */
const searchWithHighlight = (text, query) => {
  if (!query) return { text, matches: [] };
  
  const regex = new RegExp(query, 'gi');
  const matches = text.match(regex) || [];
  const highlightedText = text.replace(regex, match => `<mark>${match}</mark>`);
  
  return {
    text: highlightedText,
    matches: matches.length,
    query
  };
};

module.exports = {
  generateHash,
  generateToken,
  formatDate,
  validateFileType,
  formatFileSize,
  sanitizeString,
  generateCaseId,
  generateEvidenceId,
  paginate,
  deepClone,
  removeSensitiveFields,
  validateEmail,
  generateOTP,
  isDateInRange,
  calculateAge,
  generateUniqueFilename,
  extractTextFromFile,
  searchWithHighlight
};
