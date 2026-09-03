const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

// GET /api/business/info
router.get('/info', businessController.getBusinessInfo);

// PUT /api/business/info
router.put('/info', businessController.updateBusinessInfo);

// PATCH /api/business/toggle
router.patch('/toggle', businessController.toggleOpenStatus);

// GET /api/business/stats
router.get('/stats', businessController.getDashboardStats);

module.exports = router;
