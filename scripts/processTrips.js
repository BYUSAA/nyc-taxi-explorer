const fs = require('fs');
const readline = require('readline');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

class TripProcessor {
    constructor() {
        this.stats = {
            total: 0,
            valid: 0,
            invalid: 0,
            errors: {}
        };
        this.connection = null;
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'urban_mobility'
        });
    }

    async processFile(inputFile) {
        console.log('🚀 Starting trip processing...');
        console.log(`Input file: ${inputFile}`);
        
        await this.connect();
        
        const fileStream = fs.createReadStream(inputFile);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let isFirstLine = true;
        let headers = [];
        let batch = [];
        const BATCH_SIZE = 1000;

        for await (const line of rl) {
            if (isFirstLine) {
                headers = this.parseCSVLine(line);
                isFirstLine = false;
                continue;
            }

            const values = this.parseCSVLine(line);
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index];
            });

            const cleaned = this.cleanRecord(record);
            
            if (cleaned.valid) {
                batch.push(cleaned.data);
                this.stats.valid++;
            } else {
                this.stats.invalid++;
                this.stats.errors[cleaned.reason] = (this.stats.errors[cleaned.reason] || 0) + 1;
            }

            this.stats.total++;

            if (batch.length >= BATCH_SIZE) {
                await this.insertBatch(batch);
                batch = [];
                console.log(`📊 Processed ${this.stats.total.toLocaleString()} records...`);
            }
        }

        if (batch.length > 0) {
            await this.insertBatch(batch);
        }

        await this.logStats();
        await this.connection.end();
        
        this.printSummary();
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        return values;
    }

    cleanRecord(record) {
        try {
            // Check required fields
            if (!record.tpep_pickup_datetime || !record.tpep_dropoff_datetime) {
                return { valid: false, reason: 'missing_datetime' };
            }

            if (!record.PULocationID || !record.DOLocationID) {
                return { valid: false, reason: 'missing_location' };
            }

            // Parse numeric values
            const distance = parseFloat(record.trip_distance) || 0;
            const fare = parseFloat(record.fare_amount) || 0;
            const total = parseFloat(record.total_amount) || 0;
            const tip = parseFloat(record.tip_amount) || 0;

            // Validate ranges
            if (distance < 0 || distance > 100) {
                return { valid: false, reason: distance < 0 ? 'negative_distance' : 'distance_too_long' };
            }

            if (fare < 0 || fare > 500) {
                return { valid: false, reason: fare < 0 ? 'negative_fare' : 'fare_too_high' };
            }

            if (total < 0 || total > 1000) {
                return { valid: false, reason: 'invalid_total' };
            }

            // Parse dates
            const pickup = new Date(record.tpep_pickup_datetime);
            const dropoff = new Date(record.tpep_dropoff_datetime);

            if (isNaN(pickup) || isNaN(dropoff)) {
                return { valid: false, reason: 'invalid_datetime' };
            }

            // Calculate duration
            const durationMin = (dropoff - pickup) / (1000 * 60);
            if (durationMin < 1 || durationMin > 180) {
                return { valid: false, reason: durationMin < 1 ? 'duration_too_short' : 'duration_too_long' };
            }

            // Calculate speed
            const speed = distance / (durationMin / 60);
            if (speed > 100) {
                return { valid: false, reason: 'speed_too_high' };
            }

            // Valid record - prepare for insertion
            const cleaned = {
                vendor_id: parseInt(record.VendorID) || 1,
                pickup_datetime: this.formatDate(pickup),
                dropoff_datetime: this.formatDate(dropoff),
                passenger_count: parseInt(record.passenger_count) || 1,
                trip_distance: distance.toFixed(2),
                pickup_location_id: parseInt(record.PULocationID),
                dropoff_location_id: parseInt(record.DOLocationID),
                rate_code_id: parseInt(record.RatecodeID) || 1,
                store_and_fwd_flag: record.store_and_fwd_flag === 'Y' ? 'Y' : 'N',
                payment_type: parseInt(record.payment_type) || 1,
                fare_amount: fare.toFixed(2),
                extra: parseFloat(record.extra || 0).toFixed(2),
                mta_tax: parseFloat(record.mta_tax || 0.5).toFixed(2),
                tip_amount: tip.toFixed(2),
                tolls_amount: parseFloat(record.tolls_amount || 0).toFixed(2),
                improvement_surcharge: parseFloat(record.improvement_surcharge || 0.3).toFixed(2),
                total_amount: total.toFixed(2),
                congestion_surcharge: parseFloat(record.congestion_surcharge || 2.5).toFixed(2)
            };

            return { valid: true, data: cleaned };

        } catch (error) {
            return { valid: false, reason: 'processing_error' };
        }
    }

    formatDate(date) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    async insertBatch(batch) {
        const query = `
            INSERT INTO trips (
                vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
                trip_distance, pickup_location_id, dropoff_location_id, rate_code_id,
                store_and_fwd_flag, payment_type, fare_amount, extra, mta_tax,
                tip_amount, tolls_amount, improvement_surcharge, total_amount,
                congestion_surcharge
            ) VALUES ?
        `;

        const values = batch.map(t => [
            t.vendor_id, t.pickup_datetime, t.dropoff_datetime, t.passenger_count,
            t.trip_distance, t.pickup_location_id, t.dropoff_location_id, t.rate_code_id,
            t.store_and_fwd_flag, t.payment_type, t.fare_amount, t.extra, t.mta_tax,
            t.tip_amount, t.tolls_amount, t.improvement_surcharge, t.total_amount,
            t.congestion_surcharge
        ]);

        await this.connection.query(query, [values]);
    }

    async logStats() {
        await this.connection.query(
            `INSERT INTO data_cleaning_log 
             (batch_date, records_processed, records_valid, records_excluded, exclusion_reason)
             VALUES (CURDATE(), ?, ?, ?, ?)`,
            [this.stats.total, this.stats.valid, this.stats.invalid, JSON.stringify(this.stats.errors)]
        );
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PROCESSING COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total records: ${this.stats.total.toLocaleString()}`);
        console.log(`✅ Valid: ${this.stats.valid.toLocaleString()} (${(this.stats.valid/this.stats.total*100).toFixed(1)}%)`);
        console.log(`❌ Invalid: ${this.stats.invalid.toLocaleString()}`);
        console.log('\nErrors:');
        Object.entries(this.stats.errors).forEach(([reason, count]) => {
            console.log(`  • ${reason}: ${count}`);
        });
        console.log('='.repeat(60));
    }
}

// Run if called directly
if (require.main === module) {
    const processor = new TripProcessor();
    const inputFile = process.argv[2] || path.join(__dirname, '../data/raw/yellow_tripdata_2019-01.csv');
    
    processor.processFile(inputFile).catch(console.error);
}

module.exports = TripProcessor;