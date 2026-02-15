const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// User management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

// Database maintenance
router.get('/database-stats', adminController.getDatabaseStats);
router.post('/optimize', adminController.optimizeDatabase);

// Cleaning logs
router.get('/cleaning-logs', adminController.getCleaningLogs);

// System health
router.get('/system-health', adminController.getSystemHealth);

module.exports = router;