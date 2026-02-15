const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const authMiddleware = {
    // Verify JWT token
    verifyToken: (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    },
    
    // Check if user is admin
    isAdmin: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    },
    
    // Optional: Check if user is viewer or admin
    isViewer: (req, res, next) => {
        if (req.user.role !== 'viewer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    }
};

module.exports = authMiddleware;