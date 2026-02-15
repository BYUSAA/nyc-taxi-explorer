const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', tripController.getTrips);
router.get('/stats', tripController.getStats);
router.get('/top-fares/:limit', tripController.getTopFares);
router.get('/sorted/:field', tripController.getSortedTrips);
router.get('/popular-routes', tripController.getPopularRoutes);
router.get('/:id', tripController.getTripById);

// Protected routes (require authentication)
router.post('/', authMiddleware.verifyToken, tripController.createTrip);
router.put('/:id', authMiddleware.verifyToken, tripController.updateTrip);
router.delete('/:id', authMiddleware.verifyToken, tripController.deleteTrip);
router.post('/batch', authMiddleware.verifyToken, tripController.batchCreateTrips);

module.exports = router;