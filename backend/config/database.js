/**
 * DATABASE CONFIGURATION
 * MySQL connection pool with optimized settings
 */

const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    // Connection settings
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'urban_mobility',
    port: process.env.DB_PORT || 3306,
    
    // Pool settings
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    
    // Performance settings
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    
    // Timeouts
    connectTimeout: 10000,
    acquireTimeout: 10000,
    
    // Data formatting
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true
});

// Convert to promise-based
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 as result');
        console.log('✅ Database connected successfully');
        
        // Log connection pool status
        console.log(`📊 Connection pool: ${pool.pool ? 'active' : 'initializing'}`);
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Get database statistics
const getStats = async () => {
    try {
        const [tripCount] = await promisePool.query('SELECT COUNT(*) as count FROM trips');
        const [zoneCount] = await promisePool.query('SELECT COUNT(*) as count FROM zones');
        const [userCount] = await promisePool.query('SELECT COUNT(*) as count FROM users');
        const [auditCount] = await promisePool.query('SELECT COUNT(*) as count FROM audit_log');
        
        // Get database size
        const [dbSize] = await promisePool.query(`
            SELECT 
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [process.env.DB_NAME || 'urban_mobility']);
        
        return {
            trips: tripCount[0].count,
            zones: zoneCount[0].count,
            users: userCount[0].count,
            audit_logs: auditCount[0].count,
            database_size_mb: dbSize[0]?.size_mb || 0,
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return null;
    }
};

// Execute a transaction
const executeTransaction = async (queries) => {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();
    
    try {
        const results = [];
        for (const query of queries) {
            const [result] = await connection.execute(query.sql, query.params || []);
            results.push(result);
        }
        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Batch insert with error handling
const batchInsert = async (table, columns, values, batchSize = 1000) => {
    const results = [];
    
    for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        const placeholders = batch.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
        const flatValues = batch.flat();
        
        const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
        
        try {
            const [result] = await promisePool.query(query, flatValues);
            results.push(result);
        } catch (error) {
            console.error(`Batch insert error at index ${i}:`, error);
            throw error;
        }
    }
    
    return results;
};

// Query with timeout
const queryWithTimeout = async (sql, params, timeout = 30000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const [rows] = await promisePool.query({
            sql,
            values: params,
            timeout: timeout
        });
        clearTimeout(timeoutId);
        return rows;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

module.exports = {
    pool: promisePool,
    testConnection,
    getStats,
    executeTransaction,
    batchInsert,
    queryWithTimeout
};