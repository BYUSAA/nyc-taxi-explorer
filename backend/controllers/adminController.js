/**
 * ADMIN CONTROLLER
 * Complete administrative control over the entire system
 * All operations are logged for audit trail
 */

const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const adminController = {
    // =========================================
    // USER MANAGEMENT
    // =========================================
    
    // Get all users with filtering
    getUsers: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                role, 
                search,
                sortBy = 'created_at',
                sortOrder = 'DESC' 
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT user_id, username, email, full_name, role, is_active, 
                       last_login, created_at, updated_at,
                       (SELECT COUNT(*) FROM trips) as total_trips,
                       (SELECT COUNT(*) FROM audit_log WHERE user_id = users.user_id) as action_count
                FROM users
                WHERE 1=1
            `;
            const params = [];
            
            if (role) {
                query += ' AND role = ?';
                params.push(role);
            }
            
            if (search) {
                query += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            
            // Get total count
            const countQuery = query.replace(
                'SELECT user_id, username, email, full_name, role, is_active, last_login, created_at, updated_at, (SELECT COUNT(*) FROM trips) as total_trips, (SELECT COUNT(*) FROM audit_log WHERE user_id = users.user_id) as action_count',
                'SELECT COUNT(*) as total'
            );
            
            const [countResult] = await req.db.query(countQuery, params);
            const total = countResult[0].total;
            
            // Add sorting and pagination
            query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));
            
            const [rows] = await req.db.query(query, params);
            
            res.json({
                success: true,
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Failed to get users' });
        }
    },
    
    // Create new user
    createUser: async (req, res) => {
        try {
            const { username, password, email, full_name, role } = req.body;
            
            // Validate input
            if (!username || !password || !email) {
                return res.status(400).json({ 
                    error: 'Missing required fields',
                    required: ['username', 'password', 'email']
                });
            }
            
            // Check password strength
            if (password.length < 8) {
                return res.status(400).json({ 
                    error: 'Password must be at least 8 characters' 
                });
            }
            
            // Check if user exists
            const [existing] = await req.db.query(
                'SELECT user_id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            
            if (existing.length > 0) {
                return res.status(409).json({ 
                    error: 'Username or email already exists' 
                });
            }
            
            // Hash password
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(password, salt);
            
            // Insert user
            const [result] = await req.db.query(
                `INSERT INTO users (username, password_hash, email, full_name, role, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [username, passwordHash, email, full_name || null, role || 'viewer', req.user.userId]
            );
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'CREATE_USER', 'users', result.insertId, 
                 JSON.stringify({ username, email, role }), req.ip, req.headers['user-agent']]
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
            const { email, full_name, role, is_active, password } = req.body;
            
            // Get current user data
            const [current] = await req.db.query(
                'SELECT * FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Build update query
            const updates = [];
            const values = [];
            
            if (email) {
                updates.push('email = ?');
                values.push(email);
            }
            
            if (full_name !== undefined) {
                updates.push('full_name = ?');
                values.push(full_name);
            }
            
            if (role) {
                // Check if trying to modify last admin
                if (current[0].role === 'admin' && role !== 'admin') {
                    const [adminCount] = await req.db.query(
                        'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
                    );
                    if (adminCount[0].count <= 1) {
                        return res.status(400).json({ 
                            error: 'Cannot remove last admin user' 
                        });
                    }
                }
                updates.push('role = ?');
                values.push(role);
            }
            
            if (is_active !== undefined) {
                // Check if trying to deactivate last admin
                if (current[0].role === 'admin' && is_active === false) {
                    const [adminCount] = await req.db.query(
                        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = true'
                    );
                    if (adminCount[0].count <= 1) {
                        return res.status(400).json({ 
                            error: 'Cannot deactivate last active admin' 
                        });
                    }
                }
                updates.push('is_active = ?');
                values.push(is_active);
            }
            
            if (password) {
                const salt = await bcrypt.genSalt(12);
                const passwordHash = await bcrypt.hash(password, salt);
                updates.push('password_hash = ?');
                values.push(passwordHash);
            }
            
            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }
            
            values.push(userId);
            
            await req.db.query(
                `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
                values
            );
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'UPDATE_USER', 'users', userId, 
                 JSON.stringify(current[0]), JSON.stringify(req.body), req.ip, req.headers['user-agent']]
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
            
            // Prevent self-deletion
            if (parseInt(userId) === req.user.userId) {
                return res.status(400).json({ 
                    error: 'Cannot delete your own account' 
                });
            }
            
            // Get current user data
            const [current] = await req.db.query(
                'SELECT * FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Check if last admin
            if (current[0].role === 'admin') {
                const [adminCount] = await req.db.query(
                    'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
                );
                if (adminCount[0].count <= 1) {
                    return res.status(400).json({ 
                        error: 'Cannot delete last admin user' 
                    });
                }
            }
            
            // Check for dependencies
            const [trips] = await req.db.query(
                'SELECT COUNT(*) as count FROM trips WHERE ?', 
                [{}] // This is a placeholder, adjust based on actual relationship
            );
            
            // Delete user
            await req.db.query('DELETE FROM users WHERE user_id = ?', [userId]);
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'DELETE_USER', 'users', userId, 
                 JSON.stringify(current[0]), req.ip, req.headers['user-agent']]
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
    
    // =========================================
    // AUDIT LOGS
    // =========================================
    
    // Get audit logs with filtering
    getAuditLogs: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                action, 
                table,
                userId,
                startDate,
                endDate
            } = req.query;
            
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
            
            if (userId) {
                query += ' AND a.user_id = ?';
                params.push(userId);
            }
            
            if (startDate) {
                query += ' AND DATE(a.created_at) >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND DATE(a.created_at) <= ?';
                params.push(endDate);
            }
            
            // Get total count
            const countQuery = query.replace(
                'SELECT a.*, u.username',
                'SELECT COUNT(*) as total'
            );
            
            const [countResult] = await req.db.query(countQuery, params);
            const total = countResult[0].total;
            
            // Add sorting and pagination
            query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            
            const [rows] = await req.db.query(query, params);
            
            res.json({
                success: true,
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting audit logs:', error);
            res.status(500).json({ error: 'Failed to get audit logs' });
        }
    },
    
    // Export audit logs
    exportAuditLogs: async (req, res) => {
        try {
            const { format = 'csv', startDate, endDate } = req.query;
            
            let query = `
                SELECT a.*, u.username 
                FROM audit_log a
                LEFT JOIN users u ON a.user_id = u.user_id
                WHERE 1=1
            `;
            const params = [];
            
            if (startDate) {
                query += ' AND DATE(a.created_at) >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND DATE(a.created_at) <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY a.created_at DESC';
            
            const [logs] = await req.db.query(query, params);
            
            if (format === 'csv') {
                // Create CSV
                const csvWriter = createObjectCsvWriter({
                    path: 'audit_export.csv',
                    header: [
                        { id: 'log_id', title: 'Log ID' },
                        { id: 'username', title: 'Username' },
                        { id: 'action', title: 'Action' },
                        { id: 'table_name', title: 'Table' },
                        { id: 'record_id', title: 'Record ID' },
                        { id: 'created_at', title: 'Timestamp' },
                        { id: 'ip_address', title: 'IP Address' }
                    ]
                });
                
                await csvWriter.writeRecords(logs);
                
                res.download('audit_export.csv', `audit_logs_${Date.now()}.csv`);
            } else {
                res.json({
                    success: true,
                    data: logs
                });
            }
            
        } catch (error) {
            console.error('Error exporting audit logs:', error);
            res.status(500).json({ error: 'Failed to export audit logs' });
        }
    },
    
    // =========================================
    // DATABASE MANAGEMENT
    // =========================================
    
    // Get database statistics
    getDatabaseStats: async (req, res) => {
        try {
            // Table statistics
            const [tables] = await req.db.query(`
                SELECT 
                    table_name,
                    table_rows,
                    ROUND(data_length / 1024 / 1024, 2) as data_mb,
                    ROUND(index_length / 1024 / 1024, 2) as index_mb,
                    ROUND((data_length + index_length) / 1024 / 1024, 2) as total_mb,
                    create_time,
                    update_time
                FROM information_schema.tables
                WHERE table_schema = ?
                ORDER BY table_rows DESC
            `, [process.env.DB_NAME || 'urban_mobility']);
            
            // Overall database size
            const [dbSize] = await req.db.query(`
                SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as total_size_mb,
                    ROUND(SUM(data_length) / 1024 / 1024, 2) as data_size_mb,
                    ROUND(SUM(index_length) / 1024 / 1024, 2) as index_size_mb,
                    COUNT(DISTINCT table_name) as table_count
                FROM information_schema.tables
                WHERE table_schema = ?
            `, [process.env.DB_NAME || 'urban_mobility']);
            
            // Index statistics
            const [indexes] = await req.db.query(`
                SELECT 
                    table_name,
                    index_name,
                    column_name,
                    seq_in_index,
                    cardinality
                FROM information_schema.statistics
                WHERE table_schema = ?
                ORDER BY table_name, index_name, seq_in_index
            `, [process.env.DB_NAME || 'urban_mobility']);
            
            // Query performance stats
            const [queryStats] = await req.db.query(`
                SHOW STATUS LIKE 'Queries%'
            `);
            
            res.json({
                success: true,
                data: {
                    tables,
                    database_size: dbSize[0],
                    indexes: indexes,
                    query_stats: queryStats,
                    timestamp: new Date()
                }
            });
            
        } catch (error) {
            console.error('Error getting database stats:', error);
            res.status(500).json({ error: 'Failed to get database statistics' });
        }
    },
    
    // Optimize database
    optimizeDatabase: async (req, res) => {
        try {
            const tables = ['trips', 'zones', 'users', 'audit_log', 'trip_aggregates'];
            const results = [];
            
            for (const table of tables) {
                const [result] = await req.db.query(`OPTIMIZE TABLE ${table}`);
                results.push(result[0]);
            }
            
            // Update statistics
            await req.db.query('ANALYZE TABLE trips, zones, users, audit_log, trip_aggregates');
            
            // Update aggregates
            await req.db.query('CALL sp_update_daily_aggregates(CURDATE())');
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'OPTIMIZE_DATABASE', 'database', 
                 JSON.stringify({ tables_optimized: tables.length }), req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Database optimized successfully',
                results
            });
            
        } catch (error) {
            console.error('Error optimizing database:', error);
            res.status(500).json({ error: 'Failed to optimize database' });
        }
    },
    
    // Backup database
    backupDatabase: async (req, res) => {
        try {
            const timestamp = Date.now();
            const backupFile = `backup_${timestamp}.sql`;
            
            // Get all tables
            const [tables] = await req.db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ?
            `, [process.env.DB_NAME || 'urban_mobility']);
            
            let backupSQL = `-- NYC Taxi Explorer Backup\n-- Date: ${new Date().toISOString()}\n-- Generated by Admin\n\n`;
            
            for (const table of tables) {
                const [createTable] = await req.db.query(`SHOW CREATE TABLE ${table.table_name}`);
                backupSQL += `\n\n-- Table: ${table.table_name}\n`;
                backupSQL += createTable[0]['Create Table'] + ';\n\n';
                
                // Get data
                const [rows] = await req.db.query(`SELECT * FROM ${table.table_name} LIMIT 1000`);
                
                if (rows.length > 0) {
                    const columns = Object.keys(rows[0]).join('`, `');
                    backupSQL += `INSERT INTO \`${table.table_name}\` (\`${columns}\`) VALUES\n`;
                    
                    const values = rows.map(row => {
                        const rowValues = Object.values(row).map(val => {
                            if (val === null) return 'NULL';
                            if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
                            return val;
                        }).join(', ');
                        return `(${rowValues})`;
                    }).join(',\n');
                    
                    backupSQL += values + ';\n';
                }
            }
            
            // Write to file
            await fs.writeFile(backupFile, backupSQL);
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'BACKUP_DATABASE', 'database', 
                 JSON.stringify({ file: backupFile, size: backupSQL.length }), req.ip, req.headers['user-agent']]
            );
            
            res.download(backupFile, `nyc_taxi_backup_${timestamp}.sql`);
            
        } catch (error) {
            console.error('Error backing up database:', error);
            res.status(500).json({ error: 'Failed to backup database' });
        }
    },
    
    // =========================================
    // DATA CLEANING LOGS
    // =========================================
    
    // Get cleaning logs
    getCleaningLogs: async (req, res) => {
        try {
            const { limit = 30 } = req.query;
            
            const [rows] = await req.db.query(`
                SELECT * FROM data_cleaning_log 
                ORDER BY batch_date DESC, created_at DESC 
                LIMIT ?
            `, [parseInt(limit)]);
            
            // Calculate summary statistics
            const summary = {
                total_processed: rows.reduce((sum, r) => sum + r.records_processed, 0),
                total_valid: rows.reduce((sum, r) => sum + r.records_valid, 0),
                total_excluded: rows.reduce((sum, r) => sum + r.records_excluded, 0),
                avg_retention_rate: 0
            };
            
            summary.avg_retention_rate = summary.total_processed > 0 
                ? (summary.total_valid / summary.total_processed * 100).toFixed(2)
                : 0;
            
            res.json({
                success: true,
                data: rows,
                summary
            });
            
        } catch (error) {
            console.error('Error getting cleaning logs:', error);
            res.status(500).json({ error: 'Failed to get cleaning logs' });
        }
    },
    
    // Get cleaning log details
    getCleaningLogDetails: async (req, res) => {
        try {
            const logId = req.params.id;
            
            const [rows] = await req.db.query(
                'SELECT * FROM data_cleaning_log WHERE log_id = ?',
                [logId]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Log not found' });
            }
            
            const log = rows[0];
            
            // Parse exclusion reasons
            if (log.exclusion_reason) {
                log.exclusion_reason = JSON.parse(log.exclusion_reason);
            }
            
            res.json({
                success: true,
                data: log
            });
            
        } catch (error) {
            console.error('Error getting cleaning log details:', error);
            res.status(500).json({ error: 'Failed to get cleaning log details' });
        }
    },
    
    // =========================================
    // SYSTEM HEALTH
    // =========================================
    
    // Get system health
    getSystemHealth: async (req, res) => {
        try {
            // Database health
            const [dbHealth] = await req.db.query('SELECT 1 as health');
            
            // Connection count
            const [connections] = await req.db.query('SHOW STATUS LIKE "Threads_connected"');
            
            // Slow queries
            const [slowQueries] = await req.db.query('SHOW STATUS LIKE "Slow_queries"');
            
            // Uptime
            const [uptime] = await req.db.query('SHOW STATUS LIKE "Uptime"');
            
            // Server info
            const [serverInfo] = await req.db.query('SELECT VERSION() as version');
            
            // Process list
            const [processList] = await req.db.query('SHOW PROCESSLIST');
            
            // Disk usage
            const diskUsage = process.platform === 'win32' 
                ? await this._getWindowsDiskUsage() 
                : await this._getLinuxDiskUsage();
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            
            res.json({
                success: true,
                data: {
                    database: {
                        connected: true,
                        version: serverInfo[0].version,
                        connections: connections[1].Value,
                        slow_queries: slowQueries[1].Value,
                        uptime: uptime[1].Value,
                        process_count: processList.length
                    },
                    server: {
                        uptime: process.uptime(),
                        memory: {
                            rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
                            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                            external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
                        },
                        cpu: process.cpuUsage(),
                        disk: diskUsage
                    },
                    timestamp: new Date()
                }
            });
            
        } catch (error) {
            console.error('Error getting system health:', error);
            res.status(500).json({ error: 'Failed to get system health' });
        }
    },
    
    // Helper for Windows disk usage
    _getWindowsDiskUsage: async () => {
        // This is a simplified version
        return {
            free: 'N/A',
            total: 'N/A',
            usage: 'N/A'
        };
    },
    
    // Helper for Linux disk usage
    _getLinuxDiskUsage: async () => {
        // This is a simplified version
        return {
            free: 'N/A',
            total: 'N/A',
            usage: 'N/A'
        };
    },
    
    // =========================================
    // SYSTEM SETTINGS
    // =========================================
    
    // Get system settings
    getSystemSettings: async (req, res) => {
        try {
            // This could be from a settings table
            const settings = {
                data_retention_days: 90,
                max_trip_distance: 100,
                max_fare_amount: 500,
                min_fare_amount: 2.5,
                max_trip_duration: 180,
                enable_audit_log: true,
                enable_rate_limiting: true,
                api_rate_limit: 100,
                backup_frequency: 'daily',
                maintenance_mode: false,
                version: '1.0.0',
                last_update: new Date()
            };
            
            res.json({
                success: true,
                data: settings
            });
            
        } catch (error) {
            console.error('Error getting system settings:', error);
            res.status(500).json({ error: 'Failed to get system settings' });
        }
    },
    
    // Update system settings
    updateSystemSettings: async (req, res) => {
        try {
            const settings = req.body;
            
            // Validate settings
            // This would update a settings table in production
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'UPDATE_SETTINGS', 'system', 
                 JSON.stringify(settings), req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Settings updated successfully',
                settings
            });
            
        } catch (error) {
            console.error('Error updating system settings:', error);
            res.status(500).json({ error: 'Failed to update system settings' });
        }
    },
    
    // =========================================
    // MAINTENANCE MODE
    // =========================================
    
    // Toggle maintenance mode
    toggleMaintenanceMode: async (req, res) => {
        try {
            const { enabled } = req.body;
            
            // This would update a system flag in production
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, enabled ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF', 'system',
                 JSON.stringify({ enabled }), req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
            });
            
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            res.status(500).json({ error: 'Failed to toggle maintenance mode' });
        }
    }
};

module.exports = adminController;