const db = require('../config/database');
const algorithms = require('../utils/customAlgorithms');

const analyticsController = {
    // Get hourly patterns
    getHourlyPatterns: async (req, res) => {
        try {
            const [rows] = await db.pool.query('SELECT * FROM hourly_patterns');
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error getting hourly patterns:', error);
            res.status(500).json({ error: 'Failed to get hourly patterns' });
        }
    },
    
    // Get borough statistics
    getBoroughStats: async (req, res) => {
        try {
            const [rows] = await db.pool.query('SELECT * FROM borough_stats');
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error getting borough stats:', error);
            res.status(500).json({ error: 'Failed to get borough statistics' });
        }
    },
    
    // Get daily trends
    getDailyTrends: async (req, res) => {
        try {
            const [rows] = await db.pool.query('SELECT * FROM daily_trends');
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error getting daily trends:', error);
            res.status(500).json({ error: 'Failed to get daily trends' });
        }
    },
    
    // Get popular routes
    getPopularRoutes: async (req,