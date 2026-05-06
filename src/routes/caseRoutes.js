const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCase } = require('../middleware/validation');

// Dashboard statistics
router.get('/dashboard/stats', authenticate, caseController.getDashboardStats);

// Case management
router.get('/', authenticate, caseController.getCases);
router.get('/:caseId', authenticate, caseController.getCaseDetails);
router.post('/', authenticate, validateCase, caseController.createCase);
router.put('/:caseId/status', authenticate, caseController.updateCaseStatus);

// Hearing schedule
router.get('/schedule/hearings', authenticate, caseController.getHearingSchedule);

module.exports = router;
