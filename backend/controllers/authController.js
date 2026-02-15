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
                return res.status