const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function loadZones() {
    console.log('🚀 Loading zones from CSV...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'urban_mobility'
    });
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../data/taxi_zone_lookup.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    const zones = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (handling quotes)
        const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < 4) continue;
        
        const location_id = parseInt(matches[0].replace(/"/g, ''));
        const borough = matches[1].replace(/"/g, '');
        const zone_name = matches[2].replace(/"/g, '');
        const service_zone = matches[3].replace(/"/g, '');
        
        zones.push({
            location_id,
            borough,
            zone_name,
            service_zone
        });
    }
    
    console.log(`Found ${zones.length} zones`);
    
    try {
        // Clear existing zones
        await connection.query('TRUNCATE TABLE zones');
        
        // Insert zones in batches
        const batchSize = 50;
        for (let i = 0; i < zones.length; i += batchSize) {
            const batch = zones.slice(i, i + batchSize);
            const values = batch.map(z => [z.location_id, z.borough, z.zone_name, z.service_zone]);
            
            await connection.query(
                'INSERT INTO zones (location_id, borough, zone_name, service_zone) VALUES ?',
                [values]
            );
            
            console.log(`Inserted ${i + batch.length} zones...`);
        }
        
        console.log('✅ Zones loaded successfully!');
        
        // Show sample
        const [sample] = await connection.query('SELECT * FROM zones LIMIT 10');
        console.table(sample);
        
        // Create default admin user if not exists
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await connection.query(
            `INSERT INTO users (username, password_hash, email, role) 
             VALUES ('admin', ?, 'admin@urbanmobility.com', 'admin')
             ON DUPLICATE KEY UPDATE user_id = user_id`,
            [hashedPassword]
        );
        
        console.log('✅ Default admin user created (username: admin, password: admin123)');
        
        await connection.end();
        
    } catch (error) {
        console.error('Error loading zones:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    loadZones().catch(console.error);
}

module.exports = loadZones;