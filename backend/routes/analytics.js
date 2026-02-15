const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/hourly', analyticsController.getHourlyPatterns);
router.get('/boroughs', analyticsController.getBoroughStats);
router.get('/trends', analyticsController.getDailyTrends);
router.get('/routes', analyticsController.getPopularRoutes);
router.get('/insights', analyticsController.getInsights);
router.get('/payment-types', analyticsController.getPaymentTypeDistribution);
router.get('/regression', analyticsController.getRegressionAnalysis);

module.exports = router;