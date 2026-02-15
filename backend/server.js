/**
 * NYC TAXI DATA EXPLORER - MAIN SERVER
 * Enterprise-grade backend with full admin control
 * Author: System Admin
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

// Import database connection
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const zoneRoutes = require('./routes/zones');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { auditLogger } = require('./middleware/auditLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// SECURITY MIDDLEWARE
// =============================================

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================
// DATABASE CONNECTION MIDDLEWARE
// =============================================
app.use(async (req, res, next) => {
    try {
        req.db = db.pool;
        next();
    } catch (error) {
        next(error);
    }
});

// =============================================
// API ROUTES
// =============================================

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/trips', auditLogger, tripRoutes);
app.use('/api/zones', auditLogger, zoneRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', auditLogger, adminRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [result] = await req.db.query('SELECT 1 as health');
        const stats = await getSystemStats(req.db);
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            memory: process.memoryUsage(),
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// =============================================
// FRONTEND ROUTES
// =============================================

// Serve main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Serve driver portal
app.get('/driver', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/driver.html'));
});

// Serve client portal
app.get('/client', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/client.html'));
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// Global error handler
app.use(errorHandler);

// =============================================
// HELPER FUNCTIONS
// =============================================
async function getSystemStats(db) {
    try {
        const [tripCount] = await db.query('SELECT COUNT(*) as count FROM trips');
        const [zoneCount] = await db.query('SELECT COUNT(*) as count FROM zones');
        const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
        const [auditCount] = await db.query('SELECT COUNT(*) as count FROM audit_log');
        
        return {
            trips: tripCount[0].count,
            zones: zoneCount[0].count,
            users: userCount[0].count,
            audit_logs: auditCount[0].count,
            timestamp: new Date()
        };
    } catch (error) {
        return null;
    }
}

// =============================================
// START SERVER
// =============================================
async function startServer() {
    try {
        // Test database connection
        await db.testConnection();
        
        // Start listening
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(70));
            console.log('🚕 NYC TAXI DATA EXPLORER - ENTERPRISE EDITION');
            console.log('='.repeat(70));
            console.log(`📊 Dashboard:      http://localhost:${PORT}`);
            console.log(`🔧 Admin Panel:    http://localhost:${PORT}/admin`);
            console.log(`🚖 Driver Portal:  http://localhost:${PORT}/driver`);
            console.log(`👤 Client Portal:  http://localhost:${PORT}/client`);
            console.log(`📡 API Base:       http://localhost:${PORT}/api`);
            console.log(`🩺 Health Check:   http://localhost:${PORT}/api/health`);
            console.log('='.repeat(70));
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
            console.log(`Server uptime: 0 seconds`);
            console.log('='.repeat(70) + '\n');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

startServer();