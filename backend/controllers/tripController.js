const db = require('../config/database');
const algorithms = require('../utils/customAlgorithms');

const tripController = {
    // CREATE - Add a new trip
    createTrip: async (req, res) => {
        try {
            const tripData = req.body;
            
            // Validate required fields
            const required = ['pickup_datetime', 'dropoff_datetime', 'pickup_location_id', 'dropoff_location_id'];
            for (const field of required) {
                if (!tripData[field]) {
                    return res.status(400).json({ error: `Missing required field: ${field}` });
                }
            }
            
            const [result] = await db.pool.query(
                `INSERT INTO trips 
                (vendor_id, pickup_datetime, dropoff_datetime, passenger_count, trip_distance,
                 pickup_location_id, dropoff_location_id, rate_code_id, payment_type,
                 fare_amount, extra, mta_tax, tip_amount, tolls_amount, 
                 improvement_surcharge, total_amount, congestion_surcharge)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tripData.vendor_id || 1,
                    tripData.pickup_datetime,
                    tripData.dropoff_datetime,
                    tripData.passenger_count || 1,
                    tripData.trip_distance || 0,
                    tripData.pickup_location_id,
                    tripData.dropoff_location_id,
                    tripData.rate_code_id || 1,
                    tripData.payment_type || 1,
                    tripData.fare_amount || 0,
                    tripData.extra || 0,
                    tripData.mta_tax || 0.5,
                    tripData.tip_amount || 0,
                    tripData.tolls_amount || 0,
                    tripData.improvement_surcharge || 0.3,
                    tripData.total_amount || 0,
                    tripData.congestion_surcharge || 2.5
                ]
            );
            
            // Log to audit
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'CREATE', 'trips', result.insertId, JSON.stringify(tripData), req.ip]
            );
            
            res.status(201).json({
                success: true,
                message: 'Trip created successfully',
                trip_id: result.insertId
            });
            
        } catch (error) {
            console.error('Error creating trip:', error);
            res.status(500).json({ error: 'Failed to create trip' });
        }
    },
    
    // READ - Get trips with filtering
    getTrips: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 50,
                startDate,
                endDate,
                minFare,
                maxFare,
                borough,
                sortBy = 'pickup_datetime',
                sortOrder = 'DESC'
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT t.*, 
                       z1.zone_name as pickup_zone, z1.borough as pickup_borough,
                       z2.zone_name as dropoff_zone, z2.borough as dropoff_borough
                FROM trips t
                LEFT JOIN zones z1 ON t.pickup_location_id = z1.location_id
                LEFT JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (startDate) {
                query += ' AND DATE(t.pickup_datetime) >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND DATE(t.pickup_datetime) <= ?';
                params.push(endDate);
            }
            
            if (minFare) {
                query += ' AND t.total_amount >= ?';
                params.push(minFare);
            }
            
            if (maxFare) {
                query += ' AND t.total_amount <= ?';
                params.push(maxFare);
            }
            
            if (borough) {
                query += ' AND (z1.borough = ? OR z2.borough = ?)';
                params.push(borough, borough);
            }
            
            // Get total count
            const countQuery = query.replace(
                't.*, z1.zone_name as pickup_zone, z1.borough as pickup_borough, z2.zone_name as dropoff_zone, z2.borough as dropoff_borough',
                'COUNT(*) as total'
            ).split('LEFT JOIN')[0];
            
            const [countResult] = await db.pool.query(countQuery, params);
            const total = countResult[0].total;
            
            // Add sorting and pagination
            query += ` ORDER BY t.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));
            
            const [rows] = await db.pool.query(query, params);
            
            // Calculate derived fields
            const trips = rows.map(trip => {
                const duration = (new Date(trip.dropoff_datetime) - new Date(trip.pickup_datetime)) / (1000 * 60);
                return {
                    ...trip,
                    trip_duration_minutes: duration.toFixed(2),
                    speed_mph: duration > 0 ? (trip.trip_distance / (duration / 60)).toFixed(2) : 0,
                    tip_percentage: trip.fare_amount > 0 ? ((trip.tip_amount / trip.fare_amount) * 100).toFixed(2) : 0
                };
            });
            
            res.json({
                success: true,
                data: trips,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error('Error fetching trips:', error);
            res.status(500).json({ error: 'Failed to fetch trips' });
        }
    },
    
    // READ - Get single trip by ID
    getTripById: async (req, res) => {
        try {
            const id = req.params.id;
            
            const [rows] = await db.pool.query(
                `SELECT t.*, 
                        z1.zone_name as pickup_zone, z1.borough as pickup_borough,
                        z2.zone_name as dropoff_zone, z2.borough as dropoff_borough
                 FROM trips t
                 LEFT JOIN zones z1 ON t.pickup_location_id = z1.location_id
                 LEFT JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                 WHERE t.trip_id = ?`,
                [id]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Trip not found' });
            }
            
            res.json({
                success: true,
                data: rows[0]
            });
            
        } catch (error) {
            console.error('Error fetching trip:', error);
            res.status(500).json({ error: 'Failed to fetch trip' });
        }
    },
    
    // UPDATE - Update a trip
    updateTrip: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            
            // Get current values for audit
            const [current] = await db.pool.query('SELECT * FROM trips WHERE trip_id = ?', [id]);
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'Trip not found' });
            }
            
            // Build update query dynamically
            const allowedFields = [
                'vendor_id', 'pickup_datetime', 'dropoff_datetime', 'passenger_count',
                'trip_distance', 'pickup_location_id', 'dropoff_location_id', 'rate_code_id',
                'payment_type', 'fare_amount', 'extra', 'mta_tax', 'tip_amount',
                'tolls_amount', 'improvement_surcharge', 'total_amount', 'congestion_surcharge'
            ];
            
            const setClauses = [];
            const values = [];
            
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    setClauses.push(`${field} = ?`);
                    values.push(updates[field]);
                }
            }
            
            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }
            
            values.push(id);
            
            await db.pool.query(
                `UPDATE trips SET ${setClauses.join(', ')} WHERE trip_id = ?`,
                values
            );
            
            // Log to audit
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'UPDATE', 'trips', id, JSON.stringify(current[0]), JSON.stringify(updates), req.ip]
            );
            
            res.json({
                success: true,
                message: 'Trip updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating trip:', error);
            res.status(500).json({ error: 'Failed to update trip' });
        }
    },
    
    // DELETE - Delete a trip
    deleteTrip: async (req, res) => {
        try {
            const id = req.params.id;
            
            // Get current values for audit
            const [current] = await db.pool.query('SELECT * FROM trips WHERE trip_id = ?', [id]);
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'Trip not found' });
            }
            
            await db.pool.query('DELETE FROM trips WHERE trip_id = ?', [id]);
            
            // Log to audit
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'DELETE', 'trips', id, JSON.stringify(current[0]), req.ip]
            );
            
            res.json({
                success: true,
                message: 'Trip deleted successfully'
            });
            
        } catch (error) {
            console.error('Error deleting trip:', error);
            res.status(500).json({ error: 'Failed to delete trip' });
        }
    },
    
    // BATCH CREATE - Create multiple trips
    batchCreateTrips: async (req, res) => {
        try {
            const trips = req.body.trips;
            
            if (!Array.isArray(trips) || trips.length === 0) {
                return res.status(400).json({ error: 'Invalid trips data' });
            }
            
            const results = [];
            const errors = [];
            
            for (const trip of trips) {
                try {
                    const [result] = await db.pool.query(
                        `INSERT INTO trips 
                        (vendor_id, pickup_datetime, dropoff_datetime, passenger_count, trip_distance,
                         pickup_location_id, dropoff_location_id, rate_code_id, payment_type,
                         fare_amount, extra, mta_tax, tip_amount, tolls_amount, 
                         improvement_surcharge, total_amount, congestion_surcharge)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            trip.vendor_id || 1,
                            trip.pickup_datetime,
                            trip.dropoff_datetime,
                            trip.passenger_count || 1,
                            trip.trip_distance || 0,
                            trip.pickup_location_id,
                            trip.dropoff_location_id,
                            trip.rate_code_id || 1,
                            trip.payment_type || 1,
                            trip.fare_amount || 0,
                            trip.extra || 0,
                            trip.mta_tax || 0.5,
                            trip.tip_amount || 0,
                            trip.tolls_amount || 0,
                            trip.improvement_surcharge || 0.3,
                            trip.total_amount || 0,
                            trip.congestion_surcharge || 2.5
                        ]
                    );
                    results.push({ id: result.insertId, success: true });
                } catch (err) {
                    errors.push({ trip, error: err.message });
                }
            }
            
            // Log batch operation
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?)`,
                [req.user.userId, 'BATCH_CREATE', 'trips', JSON.stringify({ count: results.length, errors: errors.length }), req.ip]
            );
            
            res.json({
                success: true,
                message: `Created ${results.length} trips, ${errors.length} failed`,
                results,
                errors
            });
            
        } catch (error) {
            console.error('Error in batch create:', error);
            res.status(500).json({ error: 'Failed to create trips' });
        }
    },
    
    // Get trip statistics
    getStats: async (req, res) => {
        try {
            const [rows] = await db.pool.query(`
                SELECT 
                    COUNT(*) as total_trips,
                    ROUND(SUM(total_amount), 2) as total_revenue,
                    ROUND(AVG(total_amount), 2) as avg_fare,
                    ROUND(AVG(trip_distance), 2) as avg_distance,
                    ROUND(AVG(tip_amount), 2) as avg_tip,
                    COUNT(DISTINCT DATE(pickup_datetime)) as days_with_data,
                    MIN(pickup_datetime) as earliest_trip,
                    MAX(pickup_datetime) as latest_trip
                FROM trips
            `);
            
            res.json({
                success: true,
                data: rows[0]
            });
            
        } catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({ error: 'Failed to get statistics' });
        }
    },
    
    // Get top fares using custom Min Heap
    getTopFares: async (req, res) => {
        try {
            const limit = parseInt(req.params.limit) || 10;
            
            const [rows] = await db.pool.query(
                'SELECT trip_id, total_amount FROM trips WHERE total_amount > 0'
            );
            
            const heap = algorithms.createMinHeap(limit);
            
            for (const row of rows) {
                heap.insert(parseFloat(row.total_amount));
            }
            
            const topFares = heap.getSorted();
            
            const [details] = await db.pool.query(
                `SELECT t.*, 
                        z1.zone_name as pickup_zone, z1.borough as pickup_borough,
                        z2.zone_name as dropoff_zone, z2.borough as dropoff_borough
                 FROM trips t
                 LEFT JOIN zones z1 ON t.pickup_location_id = z1.location_id
                 LEFT JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                 WHERE t.total_amount IN (?) 
                 ORDER BY t.total_amount DESC`,
                [topFares]
            );
            
            res.json({
                success: true,
                data: details,
                algorithm: 'MinHeap',
                complexity: `O(n log ${limit})`
            });
            
        } catch (error) {
            console.error('Error getting top fares:', error);
            res.status(500).json({ error: 'Failed to get top fares' });
        }
    },
    
    // Get sorted trips using custom Merge Sort
    getSortedTrips: async (req, res) => {
        try {
            const field = req.params.field;
            const limit = parseInt(req.query.limit) || 1000;
            
            const validFields = ['total_amount', 'trip_distance', 'tip_amount', 'fare_amount'];
            if (!validFields.includes(field)) {
                return res.status(400).json({ error: 'Invalid sort field' });
            }
            
            const [rows] = await db.pool.query(
                `SELECT t.*, 
                        z1.zone_name as pickup_zone,
                        z2.zone_name as dropoff_zone
                 FROM trips t
                 LEFT JOIN zones z1 ON t.pickup_location_id = z1.location_id
                 LEFT JOIN zones z2 ON t.dropoff_location_id = z2.location_id
                 LIMIT ?`,
                [limit]
            );
            
            const startTime = process.hrtime();
            const sorted = algorithms.mergeSort(rows, field);
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const timeMs = seconds * 1000 + nanoseconds / 1000000;
            
            res.json({
                success: true,
                data: sorted,
                algorithm: 'MergeSort',
                timeMs: timeMs.toFixed(2),
                complexity: 'O(n log n)'
            });
            
        } catch (error) {
            console.error('Error sorting trips:', error);
            res.status(500).json({ error: 'Failed to sort trips' });
        }
    },
    
    // Get popular routes using custom HashMap
    getPopularRoutes: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            
            const [rows] = await db.pool.query(
                `SELECT pickup_location_id, dropoff_location_id 
                 FROM trips 
                 ORDER BY pickup_datetime DESC 
                 LIMIT 50000`
            );
            
            const topRoutes = algorithms.findTopKRoutes(rows, limit);
            
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
                algorithm: 'HashMap + MinHeap'
            });
            
        } catch (error) {
            console.error('Error getting popular routes:', error);
            res.status(500).json({ error: 'Failed to get popular routes' });
        }
    }
};

module.exports = tripController;