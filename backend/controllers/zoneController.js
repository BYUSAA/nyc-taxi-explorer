const db = require('../config/database');

const zoneController = {
    // CREATE - Add a new zone
    createZone: async (req, res) => {
        try {
            const { location_id, borough, zone_name, service_zone } = req.body;
            
            if (!location_id || !borough || !zone_name) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            const [result] = await db.pool.query(
                'INSERT INTO zones (location_id, borough, zone_name, service_zone) VALUES (?, ?, ?, ?)',
                [location_id, borough, zone_name, service_zone || 'Boro Zone']
            );
            
            // Log to audit
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'CREATE', 'zones', location_id, JSON.stringify(req.body), req.ip]
            );
            
            res.status(201).json({
                success: true,
                message: 'Zone created successfully'
            });
            
        } catch (error) {
            console.error('Error creating zone:', error);
            res.status(500).json({ error: 'Failed to create zone' });
        }
    },
    
    // READ - Get all zones
    getAllZones: async (req, res) => {
        try {
            const [rows] = await db.pool.query(
                'SELECT * FROM zones ORDER BY borough, zone_name'
            );
            
            res.json({
                success: true,
                data: rows,
                count: rows.length
            });
            
        } catch (error) {
            console.error('Error fetching zones:', error);
            res.status(500).json({ error: 'Failed to fetch zones' });
        }
    },
    
    // READ - Get zone by ID
    getZoneById: async (req, res) => {
        try {
            const id = req.params.id;
            
            const [rows] = await db.pool.query(
                'SELECT * FROM zones WHERE location_id = ?',
                [id]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Zone not found' });
            }
            
            res.json({
                success: true,
                data: rows[0]
            });
            
        } catch (error) {
            console.error('Error fetching zone:', error);
            res.status(500).json({ error: 'Failed to fetch zone' });
        }
    },
    
    // READ - Get zones by borough
    getZonesByBorough: async (req, res) => {
        try {
            const borough = req.params.borough;
            
            const [rows] = await db.pool.query(
                'SELECT * FROM zones WHERE borough = ? ORDER BY zone_name',
                [borough]
            );
            
            res.json({
                success: true,
                data: rows,
                count: rows.length
            });
            
        } catch (error) {
            console.error('Error fetching zones by borough:', error);
            res.status(500).json({ error: 'Failed to fetch zones' });
        }
    },
    
    // UPDATE - Update a zone
    updateZone: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            
            const [current] = await db.pool.query('SELECT * FROM zones WHERE location_id = ?', [id]);
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'Zone not found' });
            }
            
            const allowedFields = ['borough', 'zone_name', 'service_zone'];
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
                `UPDATE zones SET ${setClauses.join(', ')} WHERE location_id = ?`,
                values
            );
            
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'UPDATE', 'zones', id, JSON.stringify(current[0]), JSON.stringify(updates), req.ip]
            );
            
            res.json({
                success: true,
                message: 'Zone updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating zone:', error);
            res.status(500).json({ error: 'Failed to update zone' });
        }
    },
    
    // DELETE - Delete a zone
    deleteZone: async (req, res) => {
        try {
            const id = req.params.id;
            
            // Check if zone has trips
            const [trips] = await db.pool.query(
                'SELECT COUNT(*) as count FROM trips WHERE pickup_location_id = ? OR dropoff_location_id = ?',
                [id, id]
            );
            
            if (trips[0].count > 0) {
                return res.status(400).json({ 
                    error: 'Cannot delete zone with existing trips. Update trips first.' 
                });
            }
            
            const [current] = await db.pool.query('SELECT * FROM zones WHERE location_id = ?', [id]);
            
            if (current.length === 0) {
                return res.status(404).json({ error: 'Zone not found' });
            }
            
            await db.pool.query('DELETE FROM zones WHERE location_id = ?', [id]);
            
            await db.pool.query(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.userId, 'DELETE', 'zones', id, JSON.stringify(current[0]), req.ip]
            );
            
            res.json({
                success: true,
                message: 'Zone deleted successfully'
            });
            
        } catch (error) {
            console.error('Error deleting zone:', error);
            res.status(500).json({ error: 'Failed to delete zone' });
        }
    },
    
    // GET zone statistics
    getZoneStats: async (req, res) => {
        try {
            const id = req.params.id;
            
            const [stats] = await db.pool.query(`
                SELECT 
                    z.location_id,
                    z.borough,
                    z.zone_name,
                    COUNT(DISTINCT t_pickup.trip_id) as pickup_count,
                    COUNT(DISTINCT t_dropoff.trip_id) as dropoff_count,
                    ROUND(AVG(t_pickup.total_amount), 2) as avg_pickup_fare,
                    ROUND(AVG(t_dropoff.total_amount), 2) as avg_dropoff_fare,
                    ROUND(AVG(t_pickup.trip_distance), 2) as avg_pickup_distance,
                    ROUND(AVG(t_dropoff.trip_distance), 2) as avg_dropoff_distance
                FROM zones z
                LEFT JOIN trips t_pickup ON z.location_id = t_pickup.pickup_location_id
                LEFT JOIN trips t_dropoff ON z.location_id = t_dropoff.dropoff_location_id
                WHERE z.location_id = ?
                GROUP BY z.location_id, z.borough, z.zone_name
            `, [id]);
            
            if (stats.length === 0) {
                return res.status(404).json({ error: 'Zone not found' });
            }
            
            res.json({
                success: true,
                data: stats[0]
            });
            
        } catch (error) {
            console.error('Error getting zone stats:', error);
            res.status(500).json({ error: 'Failed to get zone statistics' });
        }
    }
};

module.exports = zoneController;