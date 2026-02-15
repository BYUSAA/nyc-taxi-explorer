const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'urban_mobility',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true
});

// Convert to promise-based for async/await
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 as result');
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Get database stats
const getStats = async () => {
    try {
        const [tripCount] = await promisePool.query('SELECT COUNT(*) as count FROM trips');
        const [zoneCount] = await promisePool.query('SELECT COUNT(*) as count FROM zones');
        const [userCount] = await promisePool.query('SELECT COUNT(*) as count FROM users');
        
        return {
            trips: tripCount[0].count,
            zones: zoneCount[0].count,
            users: userCount[0].count,
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return null;
    }
};

module.exports = {
    pool: promisePool,
    testConnection,
    getStats
};