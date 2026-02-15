/**
 * AUTHENTICATION CONTROLLER
 * Handles user authentication, registration, and session management
 * Provides full admin control over user access
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

const authController = {
    // =========================================
    // USER REGISTRATION
    // =========================================
    register: async (req, res) => {
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
                    error: 'Password must be at least 8 characters long' 
                });
            }
            
            if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
                return res.status(400).json({ 
                    error: 'Password must contain at least one uppercase letter and one number' 
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
            const password_hash = await bcrypt.hash(password, salt);
            
            // Insert user
            const [result] = await req.db.query(
                `INSERT INTO users (username, password_hash, email, full_name, role, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [username, password_hash, email, full_name || null, role || 'viewer', req.user?.userId || null]
            );
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [result.insertId, 'REGISTER', 'users', result.insertId, 
                 JSON.stringify({ username, email, role }), req.ip, req.headers['user-agent']]
            );
            
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user_id: result.insertId
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    },
    
    // =========================================
    // USER LOGIN
    // =========================================
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ 
                    error: 'Username and password required' 
                });
            }
            
            // Get user
            const [users] = await req.db.query(
                `SELECT user_id, username, password_hash, email, full_name, role, is_active 
                 FROM users WHERE username = ?`,
                [username]
            );
            
            if (users.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const user = users[0];
            
            // Check if account is active
            if (!user.is_active) {
                return res.status(403).json({ error: 'Account is disabled' });
            }
            
            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                // Log failed attempt
                await req.db.query(
                    `INSERT INTO audit_log (user_id, action, table_name, old_values, ip_address, user_agent)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [user.user_id, 'LOGIN_FAILED', 'users', 
                     JSON.stringify({ attempt: 'invalid_password' }), req.ip, req.headers['user-agent']]
                );
                
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Generate tokens
            const accessToken = jwt.sign(
                { 
                    userId: user.user_id, 
                    username: user.username, 
                    role: user.role 
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY }
            );
            
            const refreshToken = crypto.randomBytes(40).toString('hex');
            
            // Store refresh token (in production, use Redis)
            await req.db.query(
                `UPDATE users SET last_login = NOW() WHERE user_id = ?`,
                [user.user_id]
            );
            
            // Log successful login
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user.user_id, 'LOGIN_SUCCESS', 'users', user.user_id,
                 JSON.stringify({ login_time: new Date() }), req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                accessToken,
                refreshToken,
                user: {
                    id: user.user_id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                },
                permissions: getPermissionsByRole(user.role)
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    },
    
    // =========================================
    // REFRESH TOKEN
    // =========================================
    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }
            
            // Verify refresh token (in production, check against stored tokens)
            // This is a simplified version
            
            const [users] = await req.db.query(
                `SELECT user_id, username, role FROM users WHERE user_id = ?`,
                [req.user.userId]
            );
            
            if (users.length === 0) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            
            const user = users[0];
            
            // Generate new access token
            const accessToken = jwt.sign(
                { userId: user.user_id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY }
            );
            
            res.json({
                success: true,
                accessToken
            });
            
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({ error: 'Token refresh failed' });
        }
    },
    
    // =========================================
    // LOGOUT
    // =========================================
    logout: async (req, res) => {
        try {
            // Log logout
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, ip_address, user_agent)
                 VALUES (?, ?, ?, ?)`,
                [req.user.userId, 'LOGOUT', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
            
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    },
    
    // =========================================
    // CHANGE PASSWORD
    // =========================================
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;
            
            // Get current password hash
            const [users] = await req.db.query(
                'SELECT password_hash FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            // Validate new password
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }
            
            // Hash new password
            const salt = await bcrypt.genSalt(12);
            const newHash = await bcrypt.hash(newPassword, salt);
            
            // Update password
            await req.db.query(
                'UPDATE users SET password_hash = ? WHERE user_id = ?',
                [newHash, userId]
            );
            
            // Log action
            await req.db.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, 'PASSWORD_CHANGE', 'users', userId, req.ip]
            );
            
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
            
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    },
    
    // =========================================
    // GET CURRENT USER
    // =========================================
    getCurrentUser: async (req, res) => {
        try {
            const [users] = await req.db.query(
                `SELECT user_id, username, email, full_name, role, created_at, last_login
                 FROM users WHERE user_id = ?`,
                [req.user.userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = users[0];
            
            res.json({
                success: true,
                user: {
                    ...user,
                    permissions: getPermissionsByRole(user.role)
                }
            });
            
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ error: 'Failed to get user info' });
        }
    },
    
    // =========================================
    // FORGOT PASSWORD
    // =========================================
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            
            const [users] = await req.db.query(
                'SELECT user_id, username FROM users WHERE email = ?',
                [email]
            );
            
            if (users.length === 0) {
                // Don't reveal that email doesn't exist
                return res.json({ 
                    success: true, 
                    message: 'If the email exists, a reset link will be sent' 
                });
            }
            
            const user = users[0];
            
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
            
            // Store reset token (in production, use a separate table)
            await req.db.query(
                `UPDATE users SET reset_token = ?, reset_expiry = ? WHERE user_id = ?`,
                [resetToken, resetExpiry, user.user_id]
            );
            
            // In production, send email here
            
            res.json({
                success: true,
                message: 'Password reset email sent',
                // In development, return token for testing
                resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
            });
            
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ error: 'Failed to process request' });
        }
    },
    
    // =========================================
    // RESET PASSWORD
    // =========================================
    resetPassword: async (req, res) => {
        try {
            const { token, newPassword } = req.body;
            
            const [users] = await req.db.query(
                `SELECT user_id FROM users 
                 WHERE reset_token = ? AND reset_expiry > NOW()`,
                [token]
            );
            
            if (users.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired token' });
            }
            
            const user = users[0];
            
            // Hash new password
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(newPassword, salt);
            
            // Update password and clear reset token
            await req.db.query(
                `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiry = NULL 
                 WHERE user_id = ?`,
                [passwordHash, user.user_id]
            );
            
            res.json({
                success: true,
                message: 'Password reset successfully'
            });
            
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }
};

// Helper function to get permissions by role
function getPermissionsByRole(role) {
    const permissions = {
        admin: {
            canManageUsers: true,
            canManageTrips: true,
            canManageZones: true,
            canViewAudit: true,
            canExportData: true,
            canDeleteData: true,
            canManageSystem: true
        },
        manager: {
            canManageUsers: false,
            canManageTrips: true,
            canManageZones: true,
            canViewAudit: true,
            canExportData: true,
            canDeleteData: false,
            canManageSystem: false
        },
        analyst: {
            canManageUsers: false,
            canManageTrips: false,
            canManageZones: false,
            canViewAudit: false,
            canExportData: true,
            canDeleteData: false,
            canManageSystem: false
        },
        viewer: {
            canManageUsers: false,
            canManageTrips: false,
            canManageZones: false,
            canViewAudit: false,
            canExportData: false,
            canDeleteData: false,
            canManageSystem: false
        }
    };
    
    return permissions[role] || permissions.viewer;
}

module.exports = authController;