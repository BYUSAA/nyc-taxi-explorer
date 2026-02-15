const db = require('../config/database');
const algorithms = require('../utils/customAlgorithms');

const analyticsController = {
    // =========================================
    // HOURLY PATTERNS
    // =========================================
    getHourlyPatterns: async (req, res) => {
        try {
            const [rows] = await db.pool.query(`
                SELECT 
                    HOUR(pickup_datetime) as hour_of_day,
                    COUNT(*) as trip_count,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(SUM(total_amount), 2) as total_revenue,
                    ROUND(AVG(passenger_count), 2) as avg_passengers,
                    ROUND(AVG(TIMESTAMPDIFF(MINUTE, pickup_datetime, dropoff_datetime)), 2) as avg_duration
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY HOUR(pickup_datetime)
                ORDER BY hour_of_day
            `);
            
            // Find peak hour
            let peakHour = null;
            let maxTrips = 0;
            
            for (const row of rows) {
                if (row.trip_count > maxTrips) {
                    maxTrips = row.trip_count;
                    peakHour = row.hour_of_day;
                }
            }
            
            res.json({
                success: true,
                data: rows,
                metadata: {
                    peak_hour: peakHour,
                    peak_hour_trips: maxTrips,
                    total_trips: rows.reduce((sum, row) => sum + row.trip_count, 0)
                }
            });
            
        } catch (error) {
            console.error('Error getting hourly patterns:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get hourly patterns' 
            });
        }
    },
    
    // =========================================
    // BOROUGH STATISTICS
    // =========================================
    getBoroughStats: async (req, res) => {
        try {
            const [rows] = await db.pool.query(`
                SELECT 
                    z.borough,
                    COUNT(t.trip_id) as trip_count,
                    ROUND(SUM(t.total_amount), 2) as total_revenue,
                    ROUND(AVG(t.total_amount), 2) as avg_fare,
                    ROUND(AVG(t.trip_distance), 2) as avg_distance,
                    ROUND(AVG(t.tip_amount), 2) as avg_tip,
                    ROUND(AVG(t.passenger_count), 2) as avg_passengers,
                    ROUND(AVG(TIMESTAMPDIFF(MINUTE, t.pickup_datetime, t.dropoff_datetime)), 2) as avg_duration,
                    COUNT(DISTINCT t.pickup_location_id) as unique_pickup_zones,
                    COUNT(DISTINCT t.dropoff_location_id) as unique_dropoff_zones
                FROM trips t
                JOIN zones z ON t.pickup_location_id = z.location_id
                WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY z.borough
                ORDER BY trip_count DESC
            `);
            
            // Calculate percentages
            const totalTrips = rows.reduce((sum, row) => sum + row.trip_count, 0);
            const enhancedRows = rows.map(row => ({
                ...row,
                percentage: ((row.trip_count / totalTrips) * 100).toFixed(2)
            }));
            
            res.json({
                success: true,
                data: enhancedRows,
                metadata: {
                    total_trips: totalTrips,
                    total_revenue: rows.reduce((sum, row) => sum + row.total_revenue, 0),
                    borough_count: rows.length
                }
            });
            
        } catch (error) {
            console.error('Error getting borough stats:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get borough statistics' 
            });
        }
    },
    
    // =========================================
    // DAILY TRENDS
    // =========================================
    getDailyTrends: async (req, res) => {
        try {
            const { days = 30 } = req.query;
            
            const [rows] = await db.pool.query(`
                SELECT 
                    DATE(pickup_datetime) as trip_date,
                    DAYOFWEEK(pickup_datetime) as day_of_week,
                    COUNT(*) as trip_count,
                    ROUND(SUM(total_amount), 2) as daily_revenue,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(passenger_count), 2) as avg_passengers,
                    COUNT(DISTINCT pickup_location_id) as active_pickup_zones,
                    COUNT(DISTINCT dropoff_location_id) as active_dropoff_zones
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(pickup_datetime)
                ORDER BY trip_date
            `, [parseInt(days)]);
            
            // Calculate moving averages
            const withMovingAvg = rows.map((row, index) => {
                const movingAvg = index >= 6 
                    ? rows.slice(index - 6, index + 1).reduce((sum, r) => sum + r.trip_count, 0) / 7
                    : null;
                
                return {
                    ...row,
                    moving_avg_7day: movingAvg ? movingAvg.toFixed(2) : null,
                    day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][row.day_of_week - 1]
                };
            });
            
            res.json({
                success: true,
                data: withMovingAvg,
                metadata: {
                    days_analyzed: rows.length,
                    avg_daily_trips: (rows.reduce((sum, r) => sum + r.trip_count, 0) / rows.length).toFixed(2),
                    avg_daily_revenue: (rows.reduce((sum, r) => sum + r.daily_revenue, 0) / rows.length).toFixed(2)
                }
            });
            
        } catch (error) {
            console.error('Error getting daily trends:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get daily trends' 
            });
        }
    },
    
    // =========================================
    // POPULAR ROUTES
    // =========================================
    getPopularRoutes: async (req, res) => {
        try {
            const { limit = 20 } = req.query;
            
            const [rows] = await db.pool.query(`
                SELECT 
                    z1.borough as pickup_borough,
                    z1.zone_name as pickup_zone,
                    z2.borough as dropoff_borough,
                    z2.zone_name as dropoff_zone,
                    COUNT(*) as trip_count,
                    ROUND(AVG(t.total_amount), 2) as avg_fare,
                    ROUND(AVG(t.trip_distance), 2) as avg_distance,
                    ROUND(AVG(t.tip_amount), 2) as avg_tip,
                    ROUND(AVG(t.passenger_count), 2) as avg_passengers,
                    ROUND(AVG(TIMESTAMPDIFF(MINUTE, t.pickup_datetime, t.dropoff_datetime)), 2) as avg_duration,
                    MIN(t.pickup_datetime) as first_trip,
                    MAX(t.pickup_datetime) as last_trip
                FROM trips t
                JOIN zones z1 ON t.pickup_location_id = z1.location_id
                JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY z1.borough, z1.zone_name, z2.borough, z2.zone_name
                ORDER BY trip_count DESC
                LIMIT ?
            `, [parseInt(limit)]);
            
            // Categorize routes
            const enhancedRows = rows.map(row => ({
                ...row,
                route_type: row.pickup_borough === row.dropoff_borough ? 'intra-borough' : 'cross-borough',
                trip_count_formatted: row.trip_count.toLocaleString()
            }));
            
            res.json({
                success: true,
                data: enhancedRows,
                metadata: {
                    total_routes: rows.length,
                    cross_borough_count: rows.filter(r => r.pickup_borough !== r.dropoff_borough).length,
                    intra_borough_count: rows.filter(r => r.pickup_borough === r.dropoff_borough).length
                }
            });
            
        } catch (error) {
            console.error('Error getting popular routes:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get popular routes' 
            });
        }
    },
    
    // =========================================
    // PAYMENT TYPE DISTRIBUTION
    // =========================================
    getPaymentTypeDistribution: async (req, res) => {
        try {
            const [rows] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN payment_type = 1 THEN 'Credit Card'
                        WHEN payment_type = 2 THEN 'Cash'
                        WHEN payment_type = 3 THEN 'No Charge'
                        WHEN payment_type = 4 THEN 'Dispute'
                        WHEN payment_type = 5 THEN 'Unknown'
                        WHEN payment_type = 6 THEN 'Voided Trip'
                        ELSE 'Other'
                    END as payment_method,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM trips), 2) as percentage,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(tip_amount) / NULLIF(AVG(total_amount), 0) * 100, 2) as tip_percentage,
                    ROUND(AVG(trip_distance), 2) as avg_distance
                FROM trips
                GROUP BY payment_type
                ORDER BY count DESC
            `);
            
            // Calculate credit card vs cash comparison
            const creditCard = rows.find(r => r.payment_method === 'Credit Card');
            const cash = rows.find(r => r.payment_method === 'Cash');
            
            let comparison = null;
            if (creditCard && cash) {
                comparison = {
                    credit_card_percentage: creditCard.percentage,
                    cash_percentage: cash.percentage,
                    credit_card_tip_avg: creditCard.avg_tip,
                    cash_tip_avg: cash.avg_tip,
                    tip_difference: (creditCard.avg_tip - cash.avg_tip).toFixed(2)
                };
            }
            
            res.json({
                success: true,
                data: rows,
                metadata: {
                    total_trips: rows.reduce((sum, r) => sum + r.count, 0),
                    comparison: comparison,
                    most_common: rows[0]?.payment_method
                }
            });
            
        } catch (error) {
            console.error('Error getting payment types:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get payment type distribution' 
            });
        }
    },
    
    // =========================================
    // REGRESSION ANALYSIS
    // =========================================
    getRegressionAnalysis: async (req, res) => {
        try {
            // Get sample data for regression
            const [rows] = await db.pool.query(`
                SELECT trip_distance, total_amount 
                FROM trips 
                WHERE trip_distance > 0 AND trip_distance < 50 
                AND total_amount > 0 AND total_amount < 200
                AND pickup_datetime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                LIMIT 10000
            `);
            
            if (rows.length === 0) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'Insufficient data for regression analysis'
                });
            }
            
            const distances = rows.map(r => parseFloat(r.trip_distance));
            const fares = rows.map(r => parseFloat(r.total_amount));
            
            // Use custom algorithm for linear regression
            const regression = algorithms.linearRegression(distances, fares);
            
            // Calculate correlation coefficient
            const correlation = algorithms.calculateCorrelation(distances, fares);
            
            // Make predictions for common distances
            const predictions = [1, 2, 5, 10, 20].map(dist => ({
                distance: dist,
                predicted_fare: regression.predict(dist).toFixed(2),
                actual_avg: (fares.reduce((sum, f, i) => {
                    return Math.abs(distances[i] - dist) < 0.5 ? sum + fares[i] : sum;
                }, 0) / distances.filter((d, i) => Math.abs(d - dist) < 0.5).length || 0).toFixed(2)
            }));
            
            res.json({
                success: true,
                data: {
                    slope: regression.slope.toFixed(4),
                    intercept: regression.intercept.toFixed(4),
                    r_squared: regression.rSquared.toFixed(4),
                    correlation: correlation.toFixed(4),
                    formula: `Fare = ${regression.slope.toFixed(2)} × Distance + ${regression.intercept.toFixed(2)}`,
                    sample_size: rows.length,
                    predictions: predictions,
                    interpretation: correlation > 0.7 ? 'Strong positive correlation' :
                                  correlation > 0.5 ? 'Moderate positive correlation' :
                                  correlation > 0.3 ? 'Weak positive correlation' : 'No significant correlation'
                }
            });
            
        } catch (error) {
            console.error('Error getting regression analysis:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get regression analysis' 
            });
        }
    },
    
    // =========================================
    // ZONE PERFORMANCE
    // =========================================
    getZonePerformance: async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            
            // Top pickup zones
            const [topPickups] = await db.pool.query(`
                SELECT 
                    z.zone_name,
                    z.borough,
                    COUNT(*) as pickup_count,
                    ROUND(SUM(t.total_amount), 2) as revenue_from_pickups,
                    ROUND(AVG(t.total_amount), 2) as avg_fare_from_pickups
                FROM trips t
                JOIN zones z ON t.pickup_location_id = z.location_id
                WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY z.location_id, z.zone_name, z.borough
                ORDER BY pickup_count DESC
                LIMIT ?
            `, [parseInt(limit)]);
            
            // Top dropoff zones
            const [topDropoffs] = await db.pool.query(`
                SELECT 
                    z.zone_name,
                    z.borough,
                    COUNT(*) as dropoff_count,
                    ROUND(SUM(t.total_amount), 2) as revenue_to_dropoffs,
                    ROUND(AVG(t.total_amount), 2) as avg_fare_to_dropoffs
                FROM trips t
                JOIN zones z ON t.dropoff_location_id = z.location_id
                WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY z.location_id, z.zone_name, z.borough
                ORDER BY dropoff_count DESC
                LIMIT ?
            `, [parseInt(limit)]);
            
            res.json({
                success: true,
                data: {
                    top_pickup_zones: topPickups,
                    top_dropoff_zones: topDropoffs
                }
            });
            
        } catch (error) {
            console.error('Error getting zone performance:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get zone performance' 
            });
        }
    },
    
    // =========================================
    // TIME-BASED COMPARISONS
    // =========================================
    getTimeComparisons: async (req, res) => {
        try {
            // Compare weekdays vs weekends
            const [weekdayWeekend] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN DAYOFWEEK(pickup_datetime) IN (1, 7) THEN 'Weekend'
                        ELSE 'Weekday'
                    END as day_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(passenger_count), 2) as avg_passengers
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY day_type
            `);
            
            // Compare rush hour vs non-rush hour
            const [rushHour] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN (HOUR(pickup_datetime) BETWEEN 7 AND 9 OR HOUR(pickup_datetime) BETWEEN 17 AND 19)
                             AND DAYOFWEEK(pickup_datetime) BETWEEN 2 AND 6
                        THEN 'Rush Hour'
                        ELSE 'Non-Rush Hour'
                    END as period_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(SUM(total_amount), 2) as total_revenue
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY period_type
            `);
            
            // Compare morning vs evening
            const [morningEvening] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN HOUR(pickup_datetime) BETWEEN 5 AND 11 THEN 'Morning (5am-11am)'
                        WHEN HOUR(pickup_datetime) BETWEEN 17 AND 23 THEN 'Evening (5pm-11pm)'
                        ELSE 'Other'
                    END as time_block,
                    COUNT(*) as trip_count,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY time_block
                HAVING time_block != 'Other'
                ORDER BY trip_count DESC
            `);
            
            res.json({
                success: true,
                data: {
                    weekday_vs_weekend: weekdayWeekend,
                    rush_vs_non_rush: rushHour,
                    morning_vs_evening: morningEvening
                }
            });
            
        } catch (error) {
            console.error('Error getting time comparisons:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get time comparisons' 
            });
        }
    },
    
    // =========================================
    // THREE KEY INSIGHTS
    // =========================================
    getInsights: async (req, res) => {
        try {
            const insights = [];
            
            // ===== INSIGHT 1: Rush Hour Revenue Premium =====
            const [rushHourData] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN (HOUR(pickup_datetime) BETWEEN 7 AND 9 OR HOUR(pickup_datetime) BETWEEN 17 AND 19)
                             AND DAYOFWEEK(pickup_datetime) BETWEEN 2 AND 6
                        THEN 'Rush Hour'
                        ELSE 'Off-Peak'
                    END as time_type,
                    COUNT(*) as trip_count,
                    ROUND(SUM(total_amount), 2) as total_revenue,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(SUM(total_amount) / COUNT(*) * 60 / AVG(TIMESTAMPDIFF(MINUTE, pickup_datetime, dropoff_datetime)), 2) as revenue_per_hour
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY time_type
            `);
            
            const rushData = rushHourData.find(r => r.time_type === 'Rush Hour');
            const offPeakData = rushHourData.find(r => r.time_type === 'Off-Peak');
            
            if (rushData && offPeakData) {
                const revenuePerHourDiff = ((rushData.revenue_per_hour - offPeakData.revenue_per_hour) / offPeakData.revenue_per_hour * 100).toFixed(1);
                const fareDiff = ((rushData.avg_fare - offPeakData.avg_fare) / offPeakData.avg_fare * 100).toFixed(1);
                
                insights.push({
                    id: 1,
                    title: '🚦 Rush Hour Revenue Premium',
                    description: `Rush hour trips generate ${revenuePerHourDiff}% higher revenue per hour compared to off-peak periods.`,
                    data: {
                        rush_hour_revenue_per_hour: `$${rushData.revenue_per_hour}`,
                        off_peak_revenue_per_hour: `$${offPeakData.revenue_per_hour}`,
                        premium_percentage: `${revenuePerHourDiff}%`,
                        rush_hour_avg_fare: `$${rushData.avg_fare}`,
                        off_peak_avg_fare: `$${offPeakData.avg_fare}`,
                        fare_premium: `${fareDiff}%`,
                        rush_hour_trips: rushData.trip_count.toLocaleString(),
                        rush_hour_revenue: `$${rushData.total_revenue.toLocaleString()}`
                    },
                    interpretation: 'Drivers can maximize earnings by focusing on rush hour periods (7-9 AM, 5-7 PM weekdays) when demand and prices are highest. The data shows a clear opportunity for supply optimization during these peak windows.',
                    actionable_tip: 'Consider offering incentives for drivers during rush hours to increase supply and capture the premium.'
                });
            }
            
            // ===== INSIGHT 2: Cross-Borough Tipping Behavior =====
            const [tippingData] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN z1.borough != z2.borough THEN 'Cross-Borough'
                        ELSE 'Same-Borough'
                    END as trip_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount) / NULLIF(AVG(total_amount), 0) * 100, 2) as tip_percentage,
                    ROUND(AVG(trip_distance), 2) as avg_distance
                FROM trips t
                JOIN zones z1 ON t.pickup_location_id = z1.location_id
                JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                WHERE t.tip_amount > 0 AND t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY trip_type
            `);
            
            const crossBorough = tippingData.find(t => t.trip_type === 'Cross-Borough');
            const sameBorough = tippingData.find(t => t.trip_type === 'Same-Borough');
            
            if (crossBorough && sameBorough) {
                const tipDiff = (crossBorough.tip_percentage - sameBorough.tip_percentage).toFixed(1);
                const distanceDiff = ((crossBorough.avg_distance - sameBorough.avg_distance) / sameBorough.avg_distance * 100).toFixed(1);
                
                insights.push({
                    id: 2,
                    title: '💵 Cross-Borough Tip Premium',
                    description: `Cross-borough trips receive ${tipDiff}% higher tip percentages and are ${distanceDiff}% longer than trips within the same borough.`,
                    data: {
                        cross_borough_tip_pct: `${crossBorough.tip_percentage}%`,
                        same_borough_tip_pct: `${sameBorough.tip_percentage}%`,
                        tip_difference: `${tipDiff}%`,
                        cross_borough_avg_tip: `$${crossBorough.avg_tip}`,
                        same_borough_avg_tip: `$${sameBorough.avg_tip}`,
                        cross_borough_distance: `${crossBorough.avg_distance} mi`,
                        same_borough_distance: `${sameBorough.avg_distance} mi`,
                        cross_borough_trips: crossBorough.trip_count.toLocaleString()
                    },
                    interpretation: 'Passengers on longer, cross-borough journeys tend to tip more generously, possibly appreciating the extra distance and effort. This suggests that drivers should prioritize cross-borough trips when available.',
                    actionable_tip: 'Taxi apps could highlight estimated tip amounts to encourage drivers to accept longer cross-borough trips.'
                });
            }
            
            // ===== INSIGHT 3: Weekend Leisure Patterns =====
            const [weekendData] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN DAYOFWEEK(pickup_datetime) IN (1, 7) THEN 'Weekend'
                        ELSE 'Weekday'
                    END as day_type,
                    COUNT(*) as trip_count,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(passenger_count), 2) as avg_passengers,
                    ROUND(AVG(total_amount) / NULLIF(AVG(trip_distance), 0), 2) as cost_per_mile,
                    HOUR(AVG(pickup_datetime)) as avg_pickup_hour
                FROM trips
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY day_type
            `);
            
            const weekend = weekendData.find(d => d.day_type === 'Weekend');
            const weekday = weekendData.find(d => d.day_type === 'Weekday');
            
            if (weekend && weekday) {
                const distanceDiff = ((weekend.avg_distance - weekday.avg_distance) / weekday.avg_distance * 100).toFixed(1);
                const passengerDiff = ((weekend.avg_passengers - weekday.avg_passengers) / weekday.avg_passengers * 100).toFixed(1);
                const costPerMileDiff = ((weekend.cost_per_mile - weekday.cost_per_mile) / weekday.cost_per_mile * 100).toFixed(1);
                
                insights.push({
                    id: 3,
                    title: '🌆 Weekend Leisure Travel',
                    description: `Weekend trips are ${distanceDiff}% longer, carry ${passengerDiff}% more passengers, and cost ${Math.abs(costPerMileDiff)}% ${parseFloat(costPerMileDiff) > 0 ? 'more' : 'less'} per mile.`,
                    data: {
                        weekend_distance: `${weekend.avg_distance} mi`,
                        weekday_distance: `${weekday.avg_distance} mi`,
                        distance_difference: `${distanceDiff}%`,
                        weekend_passengers: weekend.avg_passengers,
                        weekday_passengers: weekday.avg_passengers,
                        passenger_difference: `${passengerDiff}%`,
                        weekend_cost_per_mile: `$${weekend.cost_per_mile}`,
                        weekday_cost_per_mile: `$${weekday.cost_per_mile}`,
                        weekend_trips: weekend.trip_count.toLocaleString(),
                        weekday_trips: weekday.trip_count.toLocaleString()
                    },
                    interpretation: 'Weekends show a shift from solo commuter trips to longer, group-oriented leisure travel. This suggests different usage patterns and opportunities for targeted services.',
                    actionable_tip: 'Consider deploying larger vehicles on weekends to accommodate groups, and offer promotional rates for longer leisure trips.'
                });
            }
            
            // ===== INSIGHT 4: Airport Revenue Concentration =====
            const [airportData] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN z.zone_name LIKE '%Airport%' OR z.zone_name IN ('JFK Airport', 'LaGuardia Airport', 'Newark Airport') THEN 'Airport'
                        ELSE 'Non-Airport'
                    END as location_type,
                    COUNT(*) as trip_count,
                    ROUND(SUM(t.total_amount), 2) as total_revenue,
                    ROUND(AVG(t.total_amount), 2) as avg_fare,
                    ROUND(AVG(t.trip_distance), 2) as avg_distance
                FROM trips t
                JOIN zones z ON t.pickup_location_id = z.location_id
                WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY location_type
            `);
            
            const airport = airportData.find(a => a.location_type === 'Airport');
            const nonAirport = airportData.find(a => a.location_type === 'Non-Airport');
            
            if (airport && nonAirport) {
                const revenuePerTripDiff = ((airport.avg_fare - nonAirport.avg_fare) / nonAirport.avg_fare * 100).toFixed(1);
                
                insights.push({
                    id: 4,
                    title: '✈️ Airport Revenue Premium',
                    description: `Airport trips generate ${revenuePerTripDiff}% higher average fares compared to non-airport trips.`,
                    data: {
                        airport_avg_fare: `$${airport.avg_fare}`,
                        non_airport_avg_fare: `$${nonAirport.avg_fare}`,
                        premium_percentage: `${revenuePerTripDiff}%`,
                        airport_trips: airport.trip_count.toLocaleString(),
                        airport_revenue: `$${airport.total_revenue.toLocaleString()}`,
                        airport_distance: `${airport.avg_distance} mi`
                    },
                    interpretation: 'Airport trips are a high-value segment, commanding significantly higher fares. Drivers should prioritize positioning near airports during peak flight times.',
                    actionable_tip: 'Create dedicated airport queues and consider premium pricing for airport                     actionable_tip: 'Create dedicated airport queues and consider premium pricing for airport rides to maximize revenue.'
                });
            }
            
            // ===== INSIGHT 5: Payment Method Impact =====
            const [paymentInsight] = await db.pool.query(`
                SELECT 
                    CASE 
                        WHEN payment_type = 1 THEN 'Credit Card'
                        WHEN payment_type = 2 THEN 'Cash'
                        ELSE 'Other'
                    END as payment_method,
                    COUNT(*) as trip_count,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(tip_amount) / NULLIF(AVG(total_amount), 0) * 100, 2) as tip_percentage
                FROM trips
                WHERE payment_type IN (1, 2) AND pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY payment_method
            `);
            
            const creditCard = paymentInsight.find(p => p.payment_method === 'Credit Card');
            const cash = paymentInsight.find(p => p.payment_method === 'Cash');
            
            if (creditCard && cash) {
                const tipDiff = (creditCard.tip_percentage - cash.tip_percentage).toFixed(1);
                
                insights.push({
                    id: 5,
                    title: '💳 Credit Card Tip Premium',
                    description: `Credit card payments result in ${tipDiff}% higher tip percentages compared to cash payments.`,
                    data: {
                        credit_card_tip_pct: `${creditCard.tip_percentage}%`,
                        cash_tip_pct: `${cash.tip_percentage}%`,
                        tip_difference: `${tipDiff}%`,
                        credit_card_avg_tip: `$${creditCard.avg_tip}`,
                        cash_avg_tip: `$${cash.avg_tip}`,
                        credit_card_trips: creditCard.trip_count.toLocaleString(),
                        cash_trips: cash.trip_count.toLocaleString()
                    },
                    interpretation: 'Passengers paying with credit cards tend to tip more, possibly due to convenience and suggested tip amounts on payment screens.',
                    actionable_tip: 'Encourage credit card payments by highlighting convenience and providing easy tipping options on the payment interface.'
                });
            }
            
            res.json({
                success: true,
                insights: insights,
                count: insights.length,
                generated_at: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error generating insights:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to generate insights' 
            });
        }
    },
    
    // =========================================
    // CUSTOM ANALYTICS WITH ALGORITHMS
    // =========================================
    
    // Find top K routes using custom Min Heap
    getTopRoutesWithHeap: async (req, res) => {
        try {
            const k = parseInt(req.params.k) || 10;
            
            // Get recent trips
            const [rows] = await db.pool.query(`
                SELECT pickup_location_id, dropoff_location_id 
                FROM trips 
                WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                LIMIT 50000
            `);
            
            // Use custom algorithm to find top routes
            const startTime = process.hrtime();
            const topRoutes = algorithms.findTopKRoutes(rows, k);
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const timeMs = seconds * 1000 + nanoseconds / 1000000;
            
            // Get zone names
            const routeDetails = [];
            for (const route of topRoutes) {
                const [pickup] = await db.pool.query(
                    'SELECT zone_name, borough FROM zones WHERE location_id = ?',
                    [route.pickup_location_id]
                );
                
                const [dropoff] = await db.pool.query(
                    'SELECT zone_name, borough FROM zones WHERE location_id = ?',
                    [route.dropoff_location_id]
                );
                
                routeDetails.push({
                    ...route,
                    pickup_zone: pickup[0]?.zone_name || 'Unknown',
                    pickup_borough: pickup[0]?.borough || 'Unknown',
                    dropoff_zone: dropoff[0]?.zone_name || 'Unknown',
                    dropoff_borough: dropoff[0]?.borough || 'Unknown'
                });
            }
            
            res.json({
                success: true,
                data: routeDetails,
                algorithm: {
                    name: 'MinHeap + HashMap',
                    time_ms: timeMs.toFixed(2),
                    complexity: `O(n log ${k})`,
                    description: `Found top ${k} routes using custom Min Heap algorithm`
                }
            });
            
        } catch (error) {
            console.error('Error getting top routes with heap:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get top routes' 
            });
        }
    },
    
    // Calculate fare statistics using custom algorithms
    getFareStatistics: async (req, res) => {
        try {
            // Get sample fares
            const [rows] = await db.pool.query(`
                SELECT total_amount 
                FROM trips 
                WHERE total_amount > 0 AND total_amount < 200
                LIMIT 10000
            `);
            
            const fares = rows.map(r => parseFloat(r.total_amount));
            
            // Use custom algorithms for statistics
            const startTime = process.hrtime();
            
            const mean = algorithms.calculateMean(fares);
            const median = algorithms.calculateMedian(fares);
            const mode = algorithms.calculateMode(fares);
            const stdDev = algorithms.calculateStdDev(fares);
            const q1 = algorithms.calculatePercentile(fares, 25);
            const q3 = algorithms.calculatePercentile(fares, 75);
            const p90 = algorithms.calculatePercentile(fares, 90);
            const p95 = algorithms.calculatePercentile(fares, 95);
            
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const timeMs = seconds * 1000 + nanoseconds / 1000000;
            
            // Detect outliers
            const outliers = algorithms.detectOutliers(fares);
            
            res.json({
                success: true,
                data: {
                    count: fares.length,
                    mean: mean.toFixed(2),
                    median: median.toFixed(2),
                    mode: mode.toFixed(2),
                    std_deviation: stdDev.toFixed(2),
                    quartiles: {
                        q1: q1.toFixed(2),
                        q3: q3.toFixed(2),
                        iqr: (q3 - q1).toFixed(2)
                    },
                    percentiles: {
                        p90: p90.toFixed(2),
                        p95: p95.toFixed(2)
                    },
                    min: Math.min(...fares).toFixed(2),
                    max: Math.max(...fares).toFixed(2),
                    outliers_count: outliers.length,
                    outliers_percentage: ((outliers.length / fares.length) * 100).toFixed(2)
                },
                algorithm: {
                    name: 'Custom Statistics',
                    time_ms: timeMs.toFixed(2),
                    description: 'All statistics calculated manually without built-in functions'
                }
            });
            
        } catch (error) {
            console.error('Error calculating fare statistics:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to calculate fare statistics' 
            });
        }
    },
    
    // Sort boroughs by revenue using custom Merge Sort
    getBoroughRanking: async (req, res) => {
        try {
            const [rows] = await db.pool.query(`
                SELECT 
                    z.borough,
                    COUNT(*) as trip_count,
                    ROUND(SUM(t.total_amount), 2) as total_revenue
                FROM trips t
                JOIN zones z ON t.pickup_location_id = z.location_id
                WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY z.borough
            `);
            
            // Use custom merge sort to sort by revenue
            const startTime = process.hrtime();
            const sorted = algorithms.mergeSort(rows, 'total_revenue');
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const timeMs = seconds * 1000 + nanoseconds / 1000000;
            
            // Reverse to get descending order
            const ranked = sorted.reverse().map((borough, index) => ({
                rank: index + 1,
                ...borough
            }));
            
            res.json({
                success: true,
                data: ranked,
                algorithm: {
                    name: 'Merge Sort',
                    time_ms: timeMs.toFixed(2),
                    complexity: 'O(n log n)',
                    description: 'Boroughs sorted by revenue using custom Merge Sort algorithm'
                }
            });
            
        } catch (error) {
            console.error('Error getting borough ranking:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get borough ranking' 
            });
        }
    },
    
    // =========================================
    // EXPORT ANALYTICS
    // =========================================
    exportAnalytics: async (req, res) => {
        try {
            const { format = 'json', days = 30 } = req.query;
            
            // Get comprehensive analytics
            const [hourly] = await db.pool.query(`
                SELECT * FROM hourly_patterns
            `);
            
            const [boroughs] = await db.pool.query(`
                SELECT * FROM borough_stats
            `);
            
            const [routes] = await db.pool.query(`
                SELECT * FROM popular_routes LIMIT 50
            `);
            
            const [trends] = await db.pool.query(`
                SELECT * FROM daily_trends LIMIT 30
            `);
            
            const analytics = {
                generated_at: new Date().toISOString(),
                period_days: days,
                summary: {
                    hourly_patterns: hourly,
                    borough_statistics: boroughs,
                    popular_routes: routes,
                    daily_trends: trends
                },
                metadata: {
                    total_hours: hourly.length,
                    total_boroughs: boroughs.length,
                    total_routes: routes.length,
                    total_days: trends.length
                }
            };
            
            if (format === 'json') {
                res.json({
                    success: true,
                    data: analytics
                });
            } else {
                // For CSV format, you'd implement CSV conversion here
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
                res.send('CSV export not implemented in this version');
            }
            
        } catch (error) {
            console.error('Error exporting analytics:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to export analytics' 
            });
        }
    },
    
    // =========================================
    // DASHBOARD SUMMARY
    // =========================================
    getDashboardSummary: async (req, res) => {
        try {
            // Get all key metrics in parallel
            const [
                totalStats,
                hourlyData,
                boroughData,
                popularRoutes,
                insights
            ] = await Promise.all([
                // Total stats
                db.pool.query(`
                    SELECT 
                        COUNT(*) as total_trips,
                        ROUND(SUM(total_amount), 2) as total_revenue,
                        ROUND(AVG(total_amount), 2) as avg_fare,
                        ROUND(AVG(trip_distance), 2) as avg_distance,
                        COUNT(DISTINCT DATE(pickup_datetime)) as active_days
                    FROM trips
                    WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                `),
                
                // Hourly patterns
                db.pool.query(`
                    SELECT HOUR(pickup_datetime) as hour, COUNT(*) as count
                    FROM trips
                    WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    GROUP BY HOUR(pickup_datetime)
                    ORDER BY hour
                `),
                
                // Borough distribution
                db.pool.query(`
                    SELECT 
                        z.borough,
                        COUNT(*) as count
                    FROM trips t
                    JOIN zones z ON t.pickup_location_id = z.location_id
                    WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY z.borough
                    ORDER BY count DESC
                `),
                
                // Popular routes
                db.pool.query(`
                    SELECT 
                        CONCAT(z1.zone_name, ' → ', z2.zone_name) as route,
                        COUNT(*) as count
                    FROM trips t
                    JOIN zones z1 ON t.pickup_location_id = z1.location_id
                    JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                    WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY route
                    ORDER BY count DESC
                    LIMIT 5
                `),
                
                // Get insights (reuse existing method but limit)
                (async () => {
                    const insightResult = await analyticsController.getInsights(req, {
                        json: () => {},
                        status: () => ({ json: () => {} })
                    });
                    return { insights: [] }; // Placeholder
                })()
            ]);
            
            res.json({
                success: true,
                data: {
                    stats: totalStats[0][0],
                    hourly_distribution: hourlyData[0],
                    borough_distribution: boroughData[0],
                    top_routes: popularRoutes[0],
                    last_updated: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('Error getting dashboard summary:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get dashboard summary' 
            });
        }
    }
};

module.exports = analyticsController;