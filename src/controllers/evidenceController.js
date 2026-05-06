const Evidence = require('../models/Evidence');
const Case = require('../models/Case');
const { logger } = require('../utils/logger');
const { generateFileHash, uploadToCloudinary, uploadToS3 } = require('../services/storageService');
const { auditLogger } = require('../utils/logger');
const crypto = require('crypto');

/**
 * Evidence Controller
 * Handles tamper-proof evidence storage and management
 */
class EvidenceController {
  /**
   * Upload evidence file
   */
  async uploadEvidence(req, res) {
    try {
      const { caseId, title, description, evidenceType, tags } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
          code: 'NO_FILE'
        });
      }

      if (!caseId || !title || !evidenceType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: caseId, title, evidenceType',
          code: 'MISSING_FIELDS'
        });
      }

      // Verify case exists and user has access
      const caseDoc = await Case.findOne({ caseId });
      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Case not found',
          code: 'CASE_NOT_FOUND'
        });
      }

      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this case',
          code: 'ACCESS_DENIED'
        });
      }

      // Generate SHA-256 hash for integrity verification
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = generateFileHash(fileBuffer);

      // Check for duplicate evidence
      const existingEvidence = await Evidence.findOne({ 
        caseId, 
        fileHash,
        status: { $ne: 'deleted' }
      });

      if (existingEvidence) {
        return res.status(409).json({
          success: false,
          message: 'Evidence with identical content already exists',
          code: 'DUPLICATE_EVIDENCE',
          data: { existingEvidenceId: existingEvidence.evidenceId }
        });
      }

      // Upload to cloud storage
      const uploadResult = await uploadToCloudinary(fileBuffer, {
        resource_type: this.getResourceType(file.mimetype),
        folder: `evidence/${caseId}`,
        public_id: `${Date.now()}-${file.originalname}`
      });

      // Create evidence record
      const evidence = new Evidence({
        caseId,
        title,
        description: description || '',
        evidenceType,
        uploadedBy: req.user.id,
        fileName: file.originalname,
        fileUrl: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        metadata: {
          originalPath: file.path,
          uploadIp: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      await evidence.save();

      // Link evidence to case
      await caseDoc.addEvidence(evidence._id, this.getPartyFromUser(req.user, caseDoc));

      // Clean up temporary file
      fs.unlinkSync(file.path);

      auditLogger.evidence('evidence_uploaded', evidence._id, req.user.id, {
        caseId,
        evidenceType,
        fileHash,
        fileSize: file.size
      });

      logger.info(`Evidence uploaded: ${evidence.evidenceId} for case ${caseId}`);

      res.status(201).json({
        success: true,
        message: 'Evidence uploaded successfully',
        data: evidence
      });
    } catch (error) {
      logger.error('Error uploading evidence:', error);
      
      // Clean up on error
      if (req.file && req.file.path) {
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload evidence',
        error: error.message
      });
    }
  }

  /**
   * Get evidence details
   */
  async getEvidence(req, res) {
    try {
      const { evidenceId } = req.params;

      const evidence = await Evidence.findOne({ evidenceId })
        .populate('uploadedBy', 'firstName lastName email role')
        .populate('verifiedBy', 'firstName lastName email');

      if (!evidence) {
        return res.status(404).json({
          success: false,
          message: 'Evidence not found',
          code: 'EVIDENCE_NOT_FOUND'
        });
      }

      // Check access permissions
      const caseDoc = await Case.findOne({ caseId: evidence.caseId });
      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      auditLogger.evidence('evidence_accessed', evidence._id, req.user.id, {
        ip: req.ip
      });

      res.json({
        success: true,
        data: evidence
      });
    } catch (error) {
      logger.error('Error getting evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch evidence',
        error: error.message
      });
    }
  }

  /**
   * Get all evidence for a case
   */
  async getCaseEvidence(req, res) {
    try {
      const { caseId } = req.params;
      const { page = 1, limit = 20, evidenceType, status } = req.query;

      // Verify case access
      const caseDoc = await Case.findOne({ caseId });
      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Case not found',
          code: 'CASE_NOT_FOUND'
        });
      }

      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Build filter
      let filter = { caseId };
      if (evidenceType) filter.evidenceType = evidenceType;
      if (status) filter.status = status;

      const evidence = await Evidence.find(filter)
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ uploadedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Evidence.countDocuments(filter);

      res.json({
        success: true,
        data: {
          evidence,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      logger.error('Error getting case evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch evidence',
        error: error.message
      });
    }
  }

  /**
   * Verify evidence integrity
   */
  async verifyEvidence(req, res) {
    try {
      const { evidenceId } = req.params;

      const evidence = await Evidence.findOne({ evidenceId });
      if (!evidence) {
        return res.status(404).json({
          success: false,
          message: 'Evidence not found',
          code: 'EVIDENCE_NOT_FOUND'
        });
      }

      // Check permissions (only judges and admins can verify)
      if (!['judge', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only judges and admins can verify evidence',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Download file from cloud storage and recalculate hash
      const https = require('https');
      const fs = require('fs');
      const path = require('path');
      
      const tempPath = path.join(__dirname, '../../temp', `${evidenceId}-verify`);
      
      // Download file
      const fileBuffer = await this.downloadFile(evidence.fileUrl);
      const currentHash = generateFileHash(fileBuffer);

      // Compare hashes
      const isValid = currentHash === evidence.fileHash;
      
      // Update verification status
      evidence.isVerified = isValid;
      evidence.verifiedBy = req.user.id;
      evidence.verifiedAt = new Date();
      evidence.verificationStatus = isValid ? 'verified' : 'tampered';
      
      await evidence.save();

      auditLogger.evidence('evidence_verified', evidence._id, req.user.id, {
        isValid,
        originalHash: evidence.fileHash,
        currentHash
      });

      res.json({
        success: true,
        message: `Evidence ${isValid ? 'verified' : 'tampered'}`,
        data: {
          evidenceId: evidence.evidenceId,
          isVerified: isValid,
          verificationStatus: evidence.verificationStatus,
          verifiedAt: evidence.verifiedAt,
          originalHash: evidence.fileHash,
          currentHash
        }
      });
    } catch (error) {
      logger.error('Error verifying evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify evidence',
        error: error.message
      });
    }
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(req, res) {
    try {
      const { evidenceId } = req.params;
      const { title, description, tags, notes } = req.body;

      const evidence = await Evidence.findOne({ evidenceId });
      if (!evidence) {
        return res.status(404).json({
          success: false,
          message: 'Evidence not found',
          code: 'EVIDENCE_NOT_FOUND'
        });
      }

      // Check permissions (uploader, judge, or admin can edit)
      const canEdit = req.user.role === 'admin' || 
                     req.user.role === 'judge' ||
                     evidence.uploadedBy.toString() === req.user.id;

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Update fields
      if (title) evidence.title = title;
      if (description !== undefined) evidence.description = description;
      if (tags) evidence.tags = tags.split(',').map(tag => tag.trim());
      if (notes) evidence.notes = notes;

      evidence.lastModifiedBy = req.user.id;
      evidence.lastModifiedAt = new Date();

      await evidence.save();

      auditLogger.evidence('evidence_updated', evidence._id, req.user.id, {
        updatedFields: Object.keys(req.body)
      });

      res.json({
        success: true,
        message: 'Evidence updated successfully',
        data: evidence
      });
    } catch (error) {
      logger.error('Error updating evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update evidence',
        error: error.message
      });
    }
  }

  /**
   * Delete evidence (soft delete)
   */
  async deleteEvidence(req, res) {
    try {
      const { evidenceId } = req.params;

      const evidence = await Evidence.findOne({ evidenceId });
      if (!evidence) {
        return res.status(404).json({
          success: false,
          message: 'Evidence not found',
          code: 'EVIDENCE_NOT_FOUND'
        });
      }

      // Check permissions (only uploader, judge, or admin can delete)
      const canDelete = req.user.role === 'admin' || 
                       req.user.role === 'judge' ||
                       evidence.uploadedBy.toString() === req.user.id;

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Soft delete (mark as deleted but keep record)
      evidence.status = 'deleted';
      evidence.deletedBy = req.user.id;
      evidence.deletedAt = new Date();
      evidence.deletionReason = req.body.reason || 'User deletion';

      await evidence.save();

      auditLogger.evidence('evidence_deleted', evidence._id, req.user.id, {
        reason: evidence.deletionReason
      });

      res.json({
        success: true,
        message: 'Evidence deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete evidence',
        error: error.message
      });
    }
  }

  /**
   * Download evidence file
   */
  async downloadEvidence(req, res) {
    try {
      const { evidenceId } = req.params;

      const evidence = await Evidence.findOne({ evidenceId });
      if (!evidence) {
        return res.status(404).json({
          success: false,
          message: 'Evidence not found',
          code: 'EVIDENCE_NOT_FOUND'
        });
      }

      // Check access permissions
      const caseDoc = await Case.findOne({ caseId: evidence.caseId });
      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      auditLogger.evidence('evidence_downloaded', evidence._id, req.user.id, {
        ip: req.ip
      });

      // Redirect to cloud storage URL
      res.redirect(evidence.fileUrl);
    } catch (error) {
      logger.error('Error downloading evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download evidence',
        error: error.message
      });
    }
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(req, res) {
    try {
      const { caseId } = req.params;

      // Verify case access
      const caseDoc = await Case.findOne({ caseId });
      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Case not found',
          code: 'CASE_NOT_FOUND'
        });
      }

      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const stats = await Evidence.aggregate([
        { $match: { caseId, status: { $ne: 'deleted' } } },
        {
          $group: {
            _id: null,
            totalEvidence: { $sum: 1 },
            verifiedEvidence: {
              $sum: { $cond: ['$isVerified', 1, 0] }
            },
            totalSize: { $sum: '$fileSize' },
            byType: {
              $push: {
                type: '$evidenceType',
                count: 1
              }
            }
          }
        }
      ]);

      const typeStats = await Evidence.aggregate([
        { $match: { caseId, status: { $ne: 'deleted' } } },
        {
          $group: {
            _id: '$evidenceType',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overall: stats[0] || {
            totalEvidence: 0,
            verifiedEvidence: 0,
            totalSize: 0
          },
          byType: typeStats
        }
      });
    } catch (error) {
      logger.error('Error getting evidence stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch evidence statistics',
        error: error.message
      });
    }
  }

  /**
   * Helper methods
   */
  getResourceType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary treats audio as video
    return 'raw';
  }

  getPartyFromUser(user, caseDoc) {
    if (user.role === 'judge') return 'court';
    if (user.role === 'lawyer') {
      if (caseDoc.plaintiff.lawyerId?.toString() === user.id) return 'plaintiff';
      if (caseDoc.defendant.lawyerId?.toString() === user.id) return 'defendant';
    }
    return 'unknown';
  }

  async downloadFile(url) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const chunks = [];
      
      https.get(url, (response) => {
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }
}

module.exports = new EvidenceController();
