const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/reports/records - paginated attendance records with filters
router.get('/records', reportController.getRecords);

// GET /api/reports/overview - summary counts for range + filters
router.get('/overview', reportController.getOverview);

module.exports = router;

