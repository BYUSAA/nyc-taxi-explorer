const db = require('../config/database');
const bcrypt = require('bcryptjs');

const adminController = {
    // ========== USER MANAGEMENT ==========
    
    // Get all users
    getUsers: async (req, res) => {
        try {
            const [rows] = await db.pool.query(
                'SELECT user_id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC'
            );
            
            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Failed to get users' });
        }
    },
    
    // Create new user
    createUser: async (req, res) => {
        try {
            const { username, password, email, role } = req.body;
            
            // Check if user exists
            const [existing] = await db.pool.query(
                'SELECT user_id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const [result] = await db.pool.query(
                'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, email, role || 'viewer']
            );
            
            // Log action
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'CREATE_USER', 'users', result.insertId, JSON.stringify({ username, email, role }), req.ip]
            );
            
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user_id: result.insertId
            });
            
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    },
    
    // Update user
    updateUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const { email, role, password } = req.body;
            
            const [current] = await db.pool.query(
                'SELECT * FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const updates = [];
            const values = [];
            
            if (email) {
                updates.push('email = ?');
                values.push(email);
            }
            
            if (role) {
                updates.push('role = ?');
                values.push(role);
            }
            
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                updates.push('password_hash = ?');
                values.push(hashedPassword);
            }
            
            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }
            
            values.push(userId);
            
            await db.pool.query(
                `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
                values
            );
            
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'UPDATE_USER', 'users', userId, JSON.stringify(current[0]), JSON.stringify(req.body), req.ip]
            );
            
            res.json({
                success: true,
                message: 'User updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    },
    
    // Delete user
    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            
            if (userId == req.user.userId) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            
            const [current] = await db.pool.query(
                'SELECT * FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            await db.pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
            
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'DELETE_USER', 'users', userId, JSON.stringify(current[0]), req.ip]
            );
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
            
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },
    
    // ========== AUDIT LOGS ==========
    
    // Get audit logs
    getAuditLogs: async (req, res) => {
        try {
            const { page = 1, limit = 50, action, table } = req.query;
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT a.*, u.username 
                FROM audit_log a
                LEFT JOIN users u ON a.user_id = u.user_id
                WHERE 1=1
            `;
            const params = [];
            
            if (action) {
                query += ' AND a.action = ?';
                params.push(action);
            }
            
            if (table) {
                query += ' AND a.table_name = ?';
                params.push(table);
            }
            
            query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            
            const [rows] = await db.pool.query(query, params);
            
            // Get total count
            const [countResult] = await db.pool.query(
                'SELECT COUNT(*) as total FROM audit_log'
            );
            
            res.json({
                success: true,
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting audit logs:', error);
            res.status(500).json({ error: 'Failed to get audit logs' });
        }
    },
    
    // ========== DATABASE MAINTENANCE ==========
    
    // Get database stats
    getDatabaseStats: async (req, res) => {
        try {
            const [tables] = await db.pool.query(`
                SELECT 
                    table_name,
                    table_rows,
                    data_length + index_length as total_size,
                    data_length,
                    index_length,
                    create_time,
                    update_time
                FROM information_schema.tables
                WHERE table_schema = 'urban_mobility'
                ORDER BY table_rows DESC
            `);
            
            const [dbSize] = await db.pool.query(`
                SELECT 
                    SUM(data_length + index_length) as total_size,
                    SUM(data_length) as data_size,
                    SUM(index_length) as index_size
                FROM information_schema.tables
                WHERE table_schema = 'urban_mobility'
            `);
            
            res.json({
                success: true,
                data: {
                    tables,
                    totals: dbSize[0]
                }
            });
            
        } catch (error) {
            console.error('Error getting database stats:', error);
            res.status(500).json({ error: 'Failed to get database stats' });
        }
    },
    
    // Run database optimization
    optimizeDatabase: async (req, res) => {
        try {
            await db.pool.query('OPTIMIZE TABLE trips, zones, users, trip_aggregates, data_cleaning_log, audit_log');
            
            // Update aggregates
            await db.pool.query('CALL update_daily_aggregates(CURDATE())');
            
            res.json({
                success: true,
                message: 'Database optimized successfully'
            });
            
        } catch (error) {
            console.error('Error optimizing database:', error);
            res.status(500).json({ error: 'Failed to optimize database' });
        }
    },
    
    // ========== DATA CLEANING LOGS ==========
    
    // Get cleaning logs
    getCleaningLogs: async (req, res) => {
        try {
            const [rows] = await db.pool.query(
                'SELECT * FROM data_cleaning_log ORDER BY batch_date DESC LIMIT 30'
            );
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error getting cleaning logs:', error);
            res.status(500).json({ error: 'Failed to get cleaning logs' });
        }
    },
    
    // ========== SYSTEM HEALTH ==========
    
    // Get system health
    getSystemHealth: async (req, res) => {
        try {
            // Check database connection
            const dbHealthy = await db.testConnection();
            
            // Get process info
            const [processInfo] = await db.pool.query('SHOW PROCESSLIST');
            
            // Get recent errors
            const [recentErrors] = await db.pool.query(`
                SELECT * FROM audit_log 
                WHERE action LIKE '%ERROR%' 
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            
            res.json({
                success: true,
                data: {
                    status: dbHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    database: {
                        connected: dbHealthy,
                        connections: processInfo.length,
                        version: processInfo[0]?.db || 'unknown'
                    },
                    recent_errors: recentErrors
                }
            });
            
        } catch (error) {
            console.error('Error getting system health:', error);
            res.status(500).json({ error: 'Failed to get system health' });
        }
    }
};

module.exports = adminController;