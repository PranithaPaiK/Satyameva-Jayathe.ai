const voiceService = require('../services/voiceService');
const VoiceRecording = require('../models/VoiceRecording');
const { logger } = require('../utils/logger');
const { auditLogger } = require('../utils/logger');

/**
 * Voice Recording Controller
 * Handles voice recording operations including upload, transcription, and analysis
 */

/**
 * Upload voice recording
 */
const uploadVoiceRecording = async (req, res) => {
  try {
    const { caseId, title, description, speakerRole, speakerId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided',
        code: 'NO_FILE'
      });
    }

    if (!caseId || !title || !speakerRole) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: caseId, title, speakerRole',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate speaker role
    const validRoles = ['judge', 'lawyer', 'plaintiff', 'defendant', 'witness', 'other'];
    if (!validRoles.includes(speakerRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid speaker role',
        code: 'INVALID_SPEAKER_ROLE'
      });
    }

    // Read file buffer
    const fs = require('fs');
    const audioBuffer = fs.readFileSync(file.path);

    // Prepare recording data
    const recordingData = {
      caseId,
      title,
      description: description || '',
      recordedBy: req.user._id,
      speakerRole,
      speakerId: speakerId || null,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      storageUrl: `/uploads/audio/${file.filename}`,
      storagePath: file.path
    };

    // Process recording
    const recording = await voiceService.processRecording(recordingData, audioBuffer);

    auditLogger.evidence('voice_uploaded', recording._id, req.user._id, {
      caseId,
      speakerRole,
      duration: recording.duration
    });

    res.status(201).json({
      success: true,
      message: 'Voice recording uploaded successfully',
      data: {
        recording: recording
      }
    });
  } catch (error) {
    logger.error('Upload voice recording error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload voice recording',
      error: error.message
    });
  }
};

/**
 * Get voice recording by ID
 */
const getVoiceRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        message: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }

    const recording = await voiceService.getRecording(recordingId, req.user._id);

    auditLogger.evidence('voice_accessed', recording._id, req.user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      data: {
        recording: recording
      }
    });
  } catch (error) {
    logger.error('Get voice recording error:', error);
    
    if (error.message === 'Recording not found') {
      return res.status(404).json({
        success: false,
        message: 'Recording not found',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    if (error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get voice recording',
      error: error.message
    });
  }
};

/**
 * Get voice recordings for a case
 */
const getCaseVoiceRecordings = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { page = 1, limit = 10, speakerRole } = req.query;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: 'Case ID is required',
        code: 'MISSING_CASE_ID'
      });
    }

    // Build filter
    const filter = {};
    if (speakerRole) {
      filter.speakerRole = speakerRole;
    }

    const recordings = await voiceService.getRecordingsByCase(caseId, req.user._id);

    // Apply additional filters
    const filteredRecordings = recordings.filter(recording => {
      if (speakerRole && recording.speakerRole !== speakerRole) {
        return false;
      }
      return true;
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecordings = filteredRecordings.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        recordings: paginatedRecordings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredRecordings.length / limit),
          totalItems: filteredRecordings.length,
          hasNext: endIndex < filteredRecordings.length,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get case voice recordings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voice recordings',
      error: error.message
    });
  }
};

/**
 * Update voice recording metadata
 */
const updateVoiceRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;
    const { title, description, tags } = req.body;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        message: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }

    const recording = await VoiceRecording.findById(recordingId);

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Check if user can update (only uploader or admin)
    if (recording.recordedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Update fields
    if (title) recording.title = title;
    if (description !== undefined) recording.description = description;
    if (tags) recording.tags = tags;

    await recording.save();

    auditLogger.evidence('voice_updated', recording._id, req.user._id, {
      updatedFields: Object.keys(req.body)
    });

    res.status(200).json({
      success: true,
      message: 'Voice recording updated successfully',
      data: {
        recording: recording
      }
    });
  } catch (error) {
    logger.error('Update voice recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update voice recording',
      error: error.message
    });
  }
};

/**
 * Delete voice recording
 */
const deleteVoiceRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        message: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }

    await voiceService.deleteRecording(recordingId, req.user._id);

    auditLogger.evidence('voice_deleted', recordingId, req.user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Voice recording deleted successfully'
    });
  } catch (error) {
    logger.error('Delete voice recording error:', error);
    
    if (error.message === 'Recording not found') {
      return res.status(404).json({
        success: false,
        message: 'Recording not found',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    if (error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete voice recording',
      error: error.message
    });
  }
};

/**
 * Get voice recording transcription
 */
const getTranscription = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        message: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }

    const recording = await voiceService.getRecording(recordingId, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        transcription: recording.transcription,
        isTranscribed: recording.isTranscribed
      }
    });
  } catch (error) {
    logger.error('Get transcription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transcription',
      error: error.message
    });
  }
};

/**
 * Get voice recording analysis
 */
const getAnalysis = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        message: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }

    const recording = await voiceService.getRecording(recordingId, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        analysis: recording.analysis,
        isAnalyzed: recording.isAnalyzed,
        hasContradictions: recording.hasContradictions
      }
    });
  } catch (error) {
    logger.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analysis',
      error: error.message
    });
  }
};

/**
 * Download voice recording file
 */
const downloadVoiceRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        message: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }

    const recording = await voiceService.getRecording(recordingId, req.user._id);

    // Check download permission
    if (!recording.hasAccess(req.user, 'download')) {
      return res.status(403).json({
        success: false,
        message: 'Download permission denied',
        code: 'DOWNLOAD_DENIED'
      });
    }

    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(recording.storagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Log download
    auditLogger.evidence('voice_downloaded', recording._id, req.user._id, {
      ip: req.ip
    });

    // Send file
    res.download(recording.storagePath, recording.originalName);
  } catch (error) {
    logger.error('Download voice recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download voice recording',
      error: error.message
    });
  }
};

/**
 * Get voice recording statistics
 */
const getVoiceStatistics = async (req, res) => {
  try {
    const { caseId } = req.query;

    let filter = {};
    if (caseId) {
      filter.caseId = caseId;
    }

    const statistics = await VoiceRecording.getStatistics(filter);

    res.status(200).json({
      success: true,
      data: {
        statistics: statistics[0] || {
          totalRecordings: 0,
          totalDuration: 0,
          avgDuration: 0,
          transcribedCount: 0,
          analyzedCount: 0,
          bySpeakerRole: []
        }
      }
    });
  } catch (error) {
    logger.error('Get voice statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voice statistics',
      error: error.message
    });
  }
};

module.exports = {
  uploadVoiceRecording,
  getVoiceRecording,
  getCaseVoiceRecordings,
  updateVoiceRecording,
  deleteVoiceRecording,
  getTranscription,
  getAnalysis,
  downloadVoiceRecording,
  getVoiceStatistics
};
