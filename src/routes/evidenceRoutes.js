const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadEvidence } = require('../middleware/upload');

// Evidence upload
router.post('/upload', authenticate, uploadEvidence.single('file'), evidenceController.uploadEvidence);

// Evidence management
router.get('/:evidenceId', authenticate, evidenceController.getEvidence);
router.get('/case/:caseId', authenticate, evidenceController.getCaseEvidence);
router.put('/:evidenceId', authenticate, evidenceController.updateEvidence);
router.delete('/:evidenceId', authenticate, evidenceController.deleteEvidence);

// Evidence verification
router.post('/:evidenceId/verify', authenticate, authorize(['judge', 'admin']), evidenceController.verifyEvidence);

// Evidence download
router.get('/:evidenceId/download', authenticate, evidenceController.downloadEvidence);

// Evidence statistics
router.get('/case/:caseId/stats', authenticate, evidenceController.getEvidenceStats);

module.exports = router;
