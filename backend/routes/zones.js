const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', zoneController.getAllZones);
router.get('/borough/:borough', zoneController.getZonesByBorough);
router.get('/stats/:id', zoneController.getZoneStats);
router.get('/:id', zoneController.getZoneById);

// Protected routes (require authentication)
router.post('/', authMiddleware.verifyToken, zoneController.createZone);
router.put('/:id', authMiddleware.verifyToken, zoneController.updateZone);
router.delete('/:id', authMiddleware.verifyToken, zoneController.deleteZone);

module.exports = router;