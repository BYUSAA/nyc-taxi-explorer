const fs = require('fs');
const readline = require('readline');
const path = require('path');
const db = require('../config/database');
const algorithms = require('./customAlgorithms');

class DataProcessor {
    constructor() {
        this.stats = {
            totalProcessed: 0,
            validRecords: 0,
            excludedRecords: 0,
            startTime: null,
            endTime: null,
            exclusions: {}
        };
    }
    
    async processTripData(inputFile, outputFile) {
        console.log('🚀 Starting data processing...');
        this.stats.startTime = new Date();
        
        const fileStream = fs.createReadStream(inputFile);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        
        const writeStream = fs.createWriteStream(outputFile);
        
        let isFirstLine = true;
        let headers = [];
        let batch = [];
        const BATCH_SIZE = 1000;
        
        for await (const line of rl) {
            if (isFirstLine) {
                headers = this.parseCSVLine(line);
                writeStream.write(line + ',trip_duration_minutes,speed_mph,cost_per_mile,tip_percentage,time_of_day,is_weekend,is_rush_hour\n');
                isFirstLine = false;
                continue;
            }
            
            const values = this.parseCSVLine(line);
            const record = {};
            for (let i = 0; i < headers.length; i++) {
                record[headers[i]] = values[i];
            }
            
            const cleaned = this.cleanRecord(record);
            
            if (cleaned.isValid) {
                const outputLine = this.formatOutputLine(cleaned.data, headers);
                batch.push(outputLine);
                
                if (batch.length >= BATCH_SIZE) {
                    writeStream.write(batch.join('\n') + '\n');
                    batch = [];
                }
                
                this.stats.validRecords++;
            } else {
                this.stats.excludedRecords++;
                const reason = cleaned.reason || 'unknown';
                this.stats.exclusions[reason] = (this.stats.exclusions[reason] || 0) + 1;
            }
            
            this.stats.totalProcessed++;
            
            if (this.stats.totalProcessed % 100000 === 0) {
                console.log(`📊 Processed ${this.stats.totalProcessed.toLocaleString()} records...`);
            }
        }
        
        if (batch.length > 0) {
            writeStream.write(batch.join('\n') + '\n');
        }
        
        writeStream.end();
        this.stats.endTime = new Date();
        
        await this.logCleaningStats();
        this.printSummary();
        
        return this.stats;
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
                return { isValid: false, reason: 'missing_datetime' };
            }
            
            if (!record.PULocationID || !record.DOLocationID) {
                return { isValid: false, reason: 'missing_location' };
            }
            
            // Parse numeric values
            const distance = parseFloat(record.trip_distance) || 0;
            const fare = parseFloat(record.fare_amount) || 0;
            const total = parseFloat(record.total_amount) || 0;
            const tip = parseFloat(record.tip_amount) || 0;
            
            // Distance validation
            if (distance < 0) {
                return { isValid: false, reason: 'negative_distance' };
            }
            if (distance > 100) {
                return { isValid: false, reason: 'distance_too_long' };
            }
            
            // Fare validation
            if (fare < 0 || total < 0 || tip < 0) {
                return { isValid: false, reason: 'negative_amount' };
            }
            if (fare > 500) {
                return { isValid: false, reason: 'fare_too_high' };
            }
            
            // Parse dates
            const pickup = new Date(record.tpep_pickup_datetime);
            const dropoff = new Date(record.tpep_dropoff_datetime);
            
            if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) {
                return { isValid: false, reason: 'invalid_datetime' };
            }
            
            // Calculate duration in minutes
            const durationMs = dropoff - pickup;
            const durationMin = durationMs / (1000 * 60);
            
            if (durationMin < 1) {
                return { isValid: false, reason: 'duration_too_short' };
            }
            if (durationMin > 180) {
                return { isValid: false, reason: 'duration_too_long' };
            }
            
            // Calculate speed
            const speed = distance / (durationMin / 60);
            if (speed > 100) {
                return { isValid: false, reason: 'speed_too_high' };
            }
            
            // Passenger count validation
            const passengers = parseInt(record.passenger_count) || 1;
            if (passengers < 0 || passengers > 6) {
                return { isValid: false, reason: 'invalid_passenger_count' };
            }
            
            // All validations passed - create enriched record
            const enriched = { ...record };
            
            // Add derived features
            enriched.trip_duration_minutes = durationMin.toFixed(2);
            enriched.speed_mph = speed.toFixed(2);
            
            const costPerMile = distance > 0 ? (total / distance) : 0;
            enriched.cost_per_mile = costPerMile.toFixed(2);
            
            const tipPercent = fare > 0 ? (tip / fare) * 100 : 0;
            enriched.tip_percentage = tipPercent.toFixed(2);
            
            // Time-based features
            const hour = pickup.getHours();
            const day = pickup.getDay();
            
            enriched.time_of_day = this.getTimeOfDay(hour);
            enriched.is_weekend = (day === 0 || day === 6) ? 'true' : 'false';
            
            const isRushHour = (day >= 1 && day <= 5) && 
                              ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19));
            enriched.is_rush_hour = isRushHour ? 'true' : 'false';
            
            return { isValid: true, data: enriched };
            
        } catch (error) {
            console.error('Error cleaning record:', error);
            return { isValid: false, reason: 'processing_error' };
        }
    }
    
    getTimeOfDay(hour) {
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
    
    formatOutputLine(record, headers) {
        const values = headers.map(h => record[h] || '');
        
        // Add derived fields
        values.push(record.trip_duration_minutes);
        values.push(record.speed_mph);
        values.push(record.cost_per_mile);
        values.push(record.tip_percentage);
        values.push(record.time_of_day);
        values.push(record.is_weekend);
        values.push(record.is_rush_hour);
        
        return values.join(',');
    }
    
    async logCleaningStats() {
        try {
            const duration = (this.stats.endTime - this.stats.startTime) / 1000;
            
            await db.pool.query(
                `INSERT INTO data_cleaning_log 
                 (batch_date, records_processed, records_valid, records_excluded, exclusion_reason) 
                 VALUES (CURDATE(), ?, ?, ?, ?)`,
                [
                    this.stats.totalProcessed,
                    this.stats.validRecords,
                    this.stats.excludedRecords,
                    JSON.stringify(this.stats.exclusions)
                ]
            );
        } catch (error) {
            console.error('Failed to log cleaning stats:', error);
        }
    }
    
    printSummary() {
        const duration = (this.stats.endTime - this.stats.startTime) / 1000;
        const retentionRate = (this.stats.validRecords / this.stats.totalProcessed * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 DATA PROCESSING COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total records processed: ${this.stats.totalProcessed.toLocaleString()}`);
        console.log(`✅ Valid records: ${this.stats.validRecords.toLocaleString()} (${retentionRate}%)`);
        console.log(`❌ Excluded records: ${this.stats.excludedRecords.toLocaleString()}`);
        console.log(`⏱️  Processing time: ${duration.toFixed(1)} seconds`);
        console.log('\nExclusion reasons:');
        
        const reasons = Object.entries(this.stats.exclusions)
            .sort((a, b) => b[1] - a[1]);
        
        for (const [reason, count] of reasons) {
            const percent = (count / this.stats.excludedRecords * 100).toFixed(1);
            console.log(`  • ${reason}: ${count.toLocaleString()} (${percent}%)`);
        }
        console.log('='.repeat(60));
    }
}

module.exports = new DataProcessor();