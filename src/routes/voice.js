const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { authenticate, authorize, requirePermission } = require('../middleware/auth');
const { uploadVoiceRecording } = require('../middleware/upload');

/**
 * Voice Recording Routes
 * Handles voice recording operations including upload, transcription, and analysis
 */

/**
 * @route   POST /api/voice/upload
 * @desc    Upload voice recording
 * @access  Private
 */
router.post('/upload', authenticate, uploadVoiceRecording, voiceController.uploadVoiceRecording);

/**
 * @route   GET /api/voice/:recordingId
 * @desc    Get voice recording by ID
 * @access  Private
 */
router.get('/:recordingId', authenticate, voiceController.getVoiceRecording);

/**
 * @route   GET /api/voice/case/:caseId
 * @desc    Get voice recordings for a case
 * @access  Private
 */
router.get('/case/:caseId', authenticate, voiceController.getCaseVoiceRecordings);

/**
 * @route   PUT /api/voice/:recordingId
 * @desc    Update voice recording metadata
 * @access  Private
 */
router.put('/:recordingId', authenticate, voiceController.updateVoiceRecording);

/**
 * @route   DELETE /api/voice/:recordingId
 * @desc    Delete voice recording
 * @access  Private
 */
router.delete('/:recordingId', authenticate, voiceController.deleteVoiceRecording);

/**
 * @route   GET /api/voice/:recordingId/transcription
 * @desc    Get voice recording transcription
 * @access  Private
 */
router.get('/:recordingId/transcription', authenticate, voiceController.getTranscription);

/**
 * @route   GET /api/voice/:recordingId/analysis
 * @desc    Get voice recording analysis
 * @access  Private
 */
router.get('/:recordingId/analysis', authenticate, voiceController.getAnalysis);

/**
 * @route   GET /api/voice/:recordingId/download
 * @desc    Download voice recording file
 * @access  Private
 */
router.get('/:recordingId/download', authenticate, voiceController.downloadVoiceRecording);

/**
 * @route   GET /api/voice/statistics
 * @desc    Get voice recording statistics
 * @access  Private
 */
router.get('/statistics', authenticate, voiceController.getVoiceStatistics);

module.exports = router;
