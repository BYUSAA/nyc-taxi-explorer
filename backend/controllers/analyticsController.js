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
    getPopularRoutes: async (req, res) => {
        try {
            const [rows] = await db.pool.query('SELECT * FROM popular_routes LIMIT 20');
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error getting popular routes:', error);
            res.status(500).json({ error: 'Failed to get popular routes' });
        }
    },
    
    // Get payment type distribution
    getPaymentTypeDistribution: async (req, res) => {
        try {
            const [rows] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN payment_type = 1 THEN 'Credit Card'
                        WHEN payment_type = 2 THEN 'Cash'
                        WHEN payment_type = 3 THEN 'No Charge'
                        WHEN payment_type = 4 THEN 'Dispute'
                        ELSE 'Other'
                    END as payment_method,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM trips), 2) as percentage,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount), 2) as avg_tip
                FROM trips
                GROUP BY payment_type
                ORDER BY count DESC
            `);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error getting payment types:', error);
            res.status(500).json({ error: 'Failed to get payment type distribution' });
        }
    },
    
    // Get three key insights
    getInsights: async (req, res) => {
        try {
            const insights = [];
            
            // Insight 1: Rush Hour Premium
            const [rushHour] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN HOUR(pickup_datetime) BETWEEN 7 AND 9 OR HOUR(pickup_datetime) BETWEEN 17 AND 19 
                        THEN 'Rush Hour' 
                        ELSE 'Off-Peak' 
                    END as time_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(SUM(total_amount), 2) as total_revenue
                FROM trips
                WHERE DAYOFWEEK(pickup_datetime) BETWEEN 2 AND 6  -- Weekdays only
                GROUP BY time_type
            `);
            
            const rushData = rushHour.find(r => r.time_type === 'Rush Hour');
            const offPeakData = rushHour.find(r => r.time_type === 'Off-Peak');
            
            if (rushData && offPeakData) {
                const premium = ((rushData.avg_fare - offPeakData.avg_fare) / offPeakData.avg_fare * 100).toFixed(1);
                
                insights.push({
                    title: 'Rush Hour Revenue Premium',
                    description: `Rush hour trips generate ${premium}% higher average fares compared to off-peak hours on weekdays.`,
                    data: {
                        rush_hour_fare: rushData.avg_fare,
                        off_peak_fare: offPeakData.avg_fare,
                        premium_percent: premium,
                        rush_hour_trips: rushData.trip_count,
                        rush_hour_revenue: rushData.total_revenue
                    },
                    interpretation: 'Drivers can maximize earnings by focusing on rush hour periods (7-9 AM, 5-7 PM) when demand and prices are highest.'
                });
            }
            
            // Insight 2: Cross-Borough Tipping Behavior
            const [tipping] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN z1.borough != z2.borough THEN 'Cross-Borough'
                        ELSE 'Same-Borough'
                    END as trip_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount) / AVG(NULLIF(total_amount, 0)) * 100, 2) as tip_percentage
                FROM trips t
                JOIN zones z1 ON t.pickup_location_id = z1.location_id
                JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                WHERE t.tip_amount > 0
                GROUP BY trip_type
            `);
            
            const crossBorough = tipping.find(t => t.trip_type === 'Cross-Borough');
            const sameBorough = tipping.find(t => t.trip_type === 'Same-Borough');
            
            if (crossBorough && sameBorough) {
                const tipDiff = (crossBorough.tip_percentage - sameBorough.tip_percentage).toFixed(1);
                
                insights.push({
                    title: 'Cross-Borough Tip Premium',
                    description: `Cross-borough trips receive ${tipDiff}% higher tip percentages compared to trips within the same borough.`,
                    data: {
                        cross_borough_tip_pct: crossBorough.tip_percentage,
                        same_borough_tip_pct: sameBorough.tip_percentage,
                        difference: tipDiff,
                        cross_borough_trips: crossBorough.trip_count,
                        cross_borough_avg_tip: crossBorough.avg_tip
                    },
                    interpretation: 'Passengers on longer, cross-borough journeys tend to tip more generously, possibly appreciating the extra distance and effort.'
                });
            }
            
            // Insight 3: Weekend Leisure Patterns
            const [weekend] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN DAYOFWEEK(pickup_datetime) IN (1, 7) THEN 'Weekend'
                        ELSE 'Weekday'
                    END as day_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(passenger_count), 2) as avg_passengers
                FROM trips
                GROUP BY day_type
            `);
            
            const weekendData = weekend.find(d => d.day_type === 'Weekend');
            const weekdayData = weekend.find(d => d.day_type === 'Weekday');
            
            if (weekendData && weekdayData) {
                const distanceDiff = ((weekendData.avg_distance - weekdayData.avg_distance) / weekdayData.avg_distance * 100).toFixed(1);
                const passengerDiff = ((weekendData.avg_passengers - weekdayData.avg_passengers) / weekdayData.avg_passengers * 100).toFixed(1);
                
                insights.push({
                    title: 'Weekend Leisure Travel',
                    description: `Weekend trips are ${distanceDiff}% longer and carry ${passengerDiff}% more passengers, reflecting a shift to group leisure travel.`,
                    data: {
                        weekend_distance: weekendData.avg_distance,
                        weekday_distance: weekdayData.avg_distance,
                        weekend_passengers: weekendData.avg_passengers,
                        weekday_passengers: weekdayData.avg_passengers,
                        weekend_trips: weekendData.trip_count,
                        weekday_trips: weekdayData.trip_count
                    },
                    interpretation: 'Weekends show a shift from solo commuter trips to longer, group-oriented leisure travel, suggesting different usage patterns and opportunities.'
                });
            }
            
            res.json({
                success: true,
                insights
            });
            
        } catch (error) {
            console.error('Error getting insights:', error);
            res.status(500).json({ error: 'Failed to get insights' });
        }
    },
    
    // Get regression analysis
    getRegressionAnalysis: async (req, res) => {
        try {
            // Get sample data for regression
            const [rows] = await db.pool.query(`
                SELECT trip_distance, total_amount 
                FROM trips 
                WHERE trip_distance > 0 AND trip_distance < 50 
                AND total_amount > 0 AND total_amount < 200
                LIMIT 10000
            `);
            
            const distances = rows.map(r => r.trip_distance);
            const fares = rows.map(r => r.total_amount);
            
            // Use custom algorithm for linear regression
            const regression = algorithms.linearRegression(distances, fares);
            
            res.json({
                success: true,
                data: {
                    slope: regression.slope,
                    intercept: regression.intercept,
                    rSquared: regression.rSquared,
                    formula: `Fare = ${regression.slope.toFixed(2)} × Distance + ${regression.intercept.toFixed(2)}`
                }
            });
            
        } catch (error) {
            console.error('Error getting regression analysis:', error);
            res.status(500).json({ error: 'Failed to get regression analysis' });
        }
    }
};

module.exports = analyticsController;