const express = require('express');
const router = express.Router();
const lawLibraryController = require('../controllers/lawLibraryController');
const { authenticate } = require('../middleware/auth');

// Search laws
router.get('/search', authenticate, lawLibraryController.searchLaws);

// Get law by ID
router.get('/:lawId', authenticate, lawLibraryController.getLaw);
router.post('/:lawId/view', authenticate, lawLibraryController.updateViewCount);

// Get related laws
router.get('/:lawId/related', authenticate, lawLibraryController.getRelatedLaws);

// Categories and acts
router.get('/categories/list', authenticate, lawLibraryController.getCategories);
router.get('/categories/:category', authenticate, lawLibraryController.getLawsByCategory);
router.get('/categories/:category/acts', authenticate, lawLibraryController.getActsByCategory);
router.get('/acts/:actName/sections', authenticate, lawLibraryController.getActSections);

// Popular laws
router.get('/popular/list', authenticate, lawLibraryController.getPopularLaws);

module.exports = router;
