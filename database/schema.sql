-- =============================================
-- NYC TAXI DATA EXPLORER - COMPLETE DATABASE SCHEMA
-- Assignment: Urban Mobility Data Explorer
-- Author: Admin
-- =============================================

DROP DATABASE IF EXISTS urban_mobility;
CREATE DATABASE urban_mobility;
USE urban_mobility;

-- =============================================
-- ZONES TABLE (Dimension)
-- Stores NYC taxi zone information from taxi_zone_lookup.csv
-- =============================================
CREATE TABLE zones (
    location_id INT PRIMARY KEY,
    borough VARCHAR(50) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    service_zone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_borough (borough),
    INDEX idx_service_zone (service_zone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='NYC Taxi Zones Dimension - 265 zones';

-- =============================================
-- TRIPS TABLE (Fact)
-- Stores cleaned and processed trip data from yellow_tripdata
-- =============================================
CREATE TABLE trips (
    trip_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id TINYINT,
    pickup_datetime DATETIME NOT NULL,
    dropoff_datetime DATETIME NOT NULL,
    passenger_count TINYINT DEFAULT 1,
    trip_distance DECIMAL(8,2),
    pickup_location_id INT,
    dropoff_location_id INT,
    rate_code_id TINYINT DEFAULT 1,
    store_and_fwd_flag CHAR(1) DEFAULT 'N',
    payment_type TINYINT,
    fare_amount DECIMAL(8,2) DEFAULT 0,
    extra DECIMAL(8,2) DEFAULT 0,
    mta_tax DECIMAL(8,2) DEFAULT 0,
    tip_amount DECIMAL(8,2) DEFAULT 0,
    tolls_amount DECIMAL(8,2) DEFAULT 0,
    improvement_surcharge DECIMAL(8,2) DEFAULT 0,
    total_amount DECIMAL(8,2) DEFAULT 0,
    congestion_surcharge DECIMAL(8,2) DEFAULT 0,
    
    -- Derived Features (Feature Engineering - 3 required)
    trip_duration_minutes INT GENERATED ALWAYS AS (
        TIMESTAMPDIFF(MINUTE, pickup_datetime, dropoff_datetime)
    ) STORED COMMENT 'Feature 1: Trip duration in minutes',
    
    speed_mph DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN TIMESTAMPDIFF(MINUTE, pickup_datetime, dropoff_datetime) > 0
            THEN trip_distance / (TIMESTAMPDIFF(MINUTE, pickup_datetime, dropoff_datetime) / 60.0)
            ELSE NULL
        END
    ) STORED COMMENT 'Feature 2: Average speed in mph',
    
    tip_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN fare_amount > 0 THEN (tip_amount / fare_amount) * 100
            ELSE 0
        END
    ) STORED COMMENT 'Feature 3: Tip percentage',
    
    -- Additional derived features for deeper insights
    cost_per_mile DECIMAL(8,2) GENERATED ALWAYS AS (
        CASE WHEN trip_distance > 0 THEN total_amount / trip_distance ELSE NULL END
    ) STORED,
    
    pickup_hour TINYINT GENERATED ALWAYS AS (HOUR(pickup_datetime)) STORED,
    pickup_day_of_week TINYINT GENERATED ALWAYS AS (DAYOFWEEK(pickup_datetime)) STORED,
    is_weekend BOOLEAN GENERATED ALWAYS AS (DAYOFWEEK(pickup_datetime) IN (1,7)) STORED,
    is_rush_hour BOOLEAN GENERATED ALWAYS AS (
        DAYOFWEEK(pickup_datetime) BETWEEN 2 AND 6 
        AND HOUR(pickup_datetime) IN (7,8,9,17,18,19)
    ) STORED,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (pickup_location_id) REFERENCES zones(location_id) ON DELETE SET NULL,
    FOREIGN KEY (dropoff_location_id) REFERENCES zones(location_id) ON DELETE SET NULL,
    
    -- Indexes for Query Optimization
    INDEX idx_pickup_datetime (pickup_datetime),
    INDEX idx_dropoff_datetime (dropoff_datetime),
    INDEX idx_pickup_location (pickup_location_id),
    INDEX idx_dropoff_location (dropoff_location_id),
    INDEX idx_trip_distance (trip_distance),
    INDEX idx_total_amount (total_amount),
    INDEX idx_payment_type (payment_type),
    INDEX idx_pickup_hour (pickup_hour),
    INDEX idx_is_weekend (is_weekend),
    INDEX idx_is_rush_hour (is_rush_hour),
    INDEX idx_composite_loc (pickup_location_id, dropoff_location_id),
    INDEX idx_composite_time (pickup_datetime, pickup_location_id),
    
    -- Constraints for data integrity
    CONSTRAINT chk_trip_distance CHECK (trip_distance >= 0 AND trip_distance <= 100),
    CONSTRAINT chk_fare_amount CHECK (fare_amount >= 0 AND fare_amount <= 500),
    CONSTRAINT chk_total_amount CHECK (total_amount >= 0),
    CONSTRAINT chk_passenger_count CHECK (passenger_count BETWEEN 0 AND 6),
    CONSTRAINT chk_dates CHECK (dropoff_datetime > pickup_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='NYC Taxi Trips Fact Table - Cleaned Data';

-- =============================================
-- USERS TABLE (Authentication & Authorization)
-- For admin control and multi-user support
-- =============================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'manager', 'analyst', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System Users for Admin Control';

-- =============================================
-- AUDIT LOG TABLE
-- Tracks all admin actions for accountability
-- =============================================
CREATE TABLE audit_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id BIGINT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_table_record (table_name, record_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit Trail for Admin Actions';

-- =============================================
-- DATA CLEANING LOG TABLE
-- Transparency for data processing
-- =============================================
CREATE TABLE data_cleaning_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id VARCHAR(50),
    batch_date DATE NOT NULL,
    source_file VARCHAR(255),
    records_processed INT DEFAULT 0,
    records_valid INT DEFAULT 0,
    records_excluded INT DEFAULT 0,
    exclusion_reason JSON,
    processing_time_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_date (batch_date),
    INDEX idx_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Data Quality and Cleaning Transparency';

-- =============================================
-- AGGREGATES TABLE (Performance Optimization)
-- Pre-computed statistics for fast dashboard loading
-- =============================================
CREATE TABLE trip_aggregates (
    agg_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    agg_date DATE NOT NULL,
    agg_hour TINYINT,
    pickup_borough VARCHAR(50),
    dropoff_borough VARCHAR(50),
    trip_count INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_fare DECIMAL(8,2) DEFAULT 0,
    avg_distance DECIMAL(8,2) DEFAULT 0,
    avg_tip DECIMAL(8,2) DEFAULT 0,
    avg_duration INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_agg (agg_date, agg_hour, pickup_borough, dropoff_borough),
    INDEX idx_date (agg_date),
    INDEX idx_borough (pickup_borough)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pre-computed Aggregates for Dashboard';

-- =============================================
-- API KEYS TABLE (For programmatic access)
-- =============================================
CREATE TABLE api_keys (
    key_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(100),
    permissions JSON,
    last_used TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_api_key (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Hourly patterns view
CREATE VIEW vw_hourly_patterns AS
SELECT 
    HOUR(pickup_datetime) as hour_of_day,
    COUNT(*) as trip_count,
    ROUND(AVG(total_amount), 2) as avg_fare,
    ROUND(AVG(trip_distance), 2) as avg_distance,
    ROUND(AVG(tip_amount), 2) as avg_tip,
    ROUND(AVG(trip_duration_minutes), 2) as avg_duration,
    ROUND(AVG(speed_mph), 2) as avg_speed,
    ROUND(AVG(tip_percentage), 2) as avg_tip_percentage
FROM trips
WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY HOUR(pickup_datetime)
ORDER BY hour_of_day;

-- Borough statistics view
CREATE VIEW vw_borough_stats AS
SELECT 
    z.borough,
    COUNT(*) as trip_count,
    ROUND(SUM(t.total_amount), 2) as total_revenue,
    ROUND(AVG(t.total_amount), 2) as avg_fare,
    ROUND(AVG(t.trip_distance), 2) as avg_distance,
    ROUND(AVG(t.tip_amount), 2) as avg_tip,
    ROUND(AVG(t.trip_duration_minutes), 2) as avg_duration,
    ROUND(AVG(t.speed_mph), 2) as avg_speed,
    ROUND(AVG(t.tip_percentage), 2) as avg_tip_percentage,
    ROUND(AVG(t.passenger_count), 2) as avg_passengers
FROM trips t
JOIN zones z ON t.pickup_location_id = z.location_id
WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY z.borough
ORDER BY trip_count DESC;

-- Popular routes view
CREATE VIEW vw_popular_routes AS
SELECT 
    z1.borough as pickup_borough,
    z1.zone_name as pickup_zone,
    z2.borough as dropoff_borough,
    z2.zone_name as dropoff_zone,
    COUNT(*) as trip_count,
    ROUND(AVG(t.total_amount), 2) as avg_fare,
    ROUND(AVG(t.trip_distance), 2) as avg_distance,
    ROUND(AVG(t.tip_amount), 2) as avg_tip,
    ROUND(AVG(t.trip_duration_minutes), 2) as avg_duration,
    CASE WHEN z1.borough = z2.borough THEN 'Intra-borough' ELSE 'Cross-borough' END as route_type
FROM trips t
JOIN zones z1 ON t.pickup_location_id = z1.location_id
JOIN zones z2 ON t.dropoff_location_id = z2.location_id
WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY z1.borough, z1.zone_name, z2.borough, z2.zone_name
ORDER BY trip_count DESC
LIMIT 100;

-- Daily trends view
CREATE VIEW vw_daily_trends AS
SELECT 
    DATE(pickup_datetime) as trip_date,
    DAYOFWEEK(pickup_datetime) as day_of_week,
    DAYNAME(pickup_datetime) as day_name,
    COUNT(*) as trip_count,
    ROUND(SUM(total_amount), 2) as daily_revenue,
    ROUND(AVG(total_amount), 2) as avg_fare,
    ROUND(AVG(trip_distance), 2) as avg_distance,
    ROUND(AVG(tip_percentage), 2) as avg_tip_percentage,
    ROUND(AVG(trip_duration_minutes), 2) as avg_duration
FROM trips
WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(pickup_datetime)
ORDER BY trip_date;

-- Rush hour analysis view
CREATE VIEW vw_rush_hour_analysis AS
SELECT 
    is_rush_hour,
    COUNT(*) as trip_count,
    ROUND(AVG(total_amount), 2) as avg_fare,
    ROUND(AVG(trip_distance), 2) as avg_distance,
    ROUND(AVG(tip_percentage), 2) as avg_tip_percentage,
    ROUND(SUM(total_amount), 2) as total_revenue,
    ROUND(AVG(speed_mph), 2) as avg_speed
FROM trips
WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY is_rush_hour;

-- =============================================
-- STORED PROCEDURES
-- =============================================

DELIMITER //

-- Procedure to update daily aggregates
CREATE PROCEDURE sp_update_daily_aggregates(IN target_date DATE)
BEGIN
    INSERT INTO trip_aggregates (agg_date, agg_hour, pickup_borough, dropoff_borough, 
                                trip_count, total_revenue, avg_fare, avg_distance, avg_tip, avg_duration)
    SELECT 
        DATE(t.pickup_datetime) as agg_date,
        HOUR(t.pickup_datetime) as agg_hour,
        z1.borough as pickup_borough,
        z2.borough as dropoff_borough,
        COUNT(*) as trip_count,
        ROUND(SUM(t.total_amount), 2) as total_revenue,
        ROUND(AVG(t.total_amount), 2) as avg_fare,
        ROUND(AVG(t.trip_distance), 2) as avg_distance,
        ROUND(AVG(t.tip_amount), 2) as avg_tip,
        ROUND(AVG(t.trip_duration_minutes), 2) as avg_duration
    FROM trips t
    JOIN zones z1 ON t.pickup_location_id = z1.location_id
    JOIN zones z2 ON t.dropoff_location_id = z2.location_id
    WHERE DATE(t.pickup_datetime) = target_date
    GROUP BY DATE(t.pickup_datetime), HOUR(t.pickup_datetime), z1.borough, z2.borough
    ON DUPLICATE KEY UPDATE
        trip_count = VALUES(trip_count),
        total_revenue = VALUES(total_revenue),
        avg_fare = VALUES(avg_fare),
        avg_distance = VALUES(avg_distance),
        avg_tip = VALUES(avg_tip),
        avg_duration = VALUES(avg_duration),
        updated_at = CURRENT_TIMESTAMP;
END //

-- Procedure to validate trip data
CREATE PROCEDURE sp_validate_trip(
    IN p_trip_distance DECIMAL(8,2),
    IN p_fare_amount DECIMAL(8,2),
    IN p_pickup DATETIME,
    IN p_dropoff DATETIME,
    OUT is_valid BOOLEAN,
    OUT validation_message VARCHAR(255)
)
BEGIN
    SET is_valid = TRUE;
    SET validation_message = 'Valid';
    
    IF p_trip_distance < 0 THEN
        SET is_valid = FALSE;
        SET validation_message = 'Negative distance';
    ELSEIF p_trip_distance > 100 THEN
        SET is_valid = FALSE;
        SET validation_message = 'Distance exceeds 100 miles';
    ELSEIF p_fare_amount < 0 THEN
        SET is_valid = FALSE;
        SET validation_message = 'Negative fare';
    ELSEIF p_fare_amount > 500 THEN
        SET is_valid = FALSE;
        SET validation_message = 'Fare exceeds $500';
    ELSEIF p_dropoff <= p_pickup THEN
        SET is_valid = FALSE;
        SET validation_message = 'Invalid datetime order';
    ELSEIF TIMESTAMPDIFF(MINUTE, p_pickup, p_dropoff) < 1 THEN
        SET is_valid = FALSE;
        SET validation_message = 'Duration too short';
    ELSEIF TIMESTAMPDIFF(MINUTE, p_pickup, p_dropoff) > 180 THEN
        SET is_valid = FALSE;
        SET validation_message = 'Duration too long';
    END IF;
END //

DELIMITER ;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to automatically log data quality issues
DELIMITER //
CREATE TRIGGER trg_trip_before_insert
BEFORE INSERT ON trips
FOR EACH ROW
BEGIN
    DECLARE v_valid BOOLEAN;
    DECLARE v_message VARCHAR(255);
    
    CALL sp_validate_trip(
        NEW.trip_distance, 
        NEW.fare_amount,
        NEW.pickup_datetime,
        NEW.dropoff_datetime,
        v_valid,
        v_message
    );
    
    IF NOT v_valid THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = v_message;
    END IF;
END //

-- Trigger to audit DELETE operations
CREATE TRIGGER trg_trip_audit_delete
AFTER DELETE ON trips
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
    VALUES (@current_user_id, 'DELETE', 'trips', OLD.trip_id, 
            JSON_OBJECT('trip_id', OLD.trip_id, 'total_amount', OLD.total_amount));
END //

DELIMITER ;

-- =============================================
-- INSERT DEFAULT ADMIN USER
-- Password: Admin@123 (hashed with bcrypt)
-- =============================================
INSERT INTO users (username, password_hash, email, full_name, role) VALUES 
('admin', '$2a$10$YourHashedPasswordHere', 'admin@urbanmobility.com', 'System Administrator', 'admin'),
('manager', '$2a$10$YourHashedPasswordHere', 'manager@urbanmobility.com', 'Data Manager', 'manager'),
('analyst', '$2a$10$YourHashedPasswordHere', 'analyst@urbanmobility.com', 'Data Analyst', 'analyst');

-- =============================================
-- DATABASE STATISTICS
-- =============================================
SELECT 'Database Schema Created Successfully' as Status;
SELECT CONCAT('Tables: ', COUNT(*)) as Tables FROM information_schema.tables WHERE table_schema = 'urban_mobility';
SELECT CONCAT('Views: ', COUNT(*)) as Views FROM information_schema.views WHERE table_schema = 'urban_mobility';
SELECT CONCAT('Indexes: ', COUNT(*)) as Indexes FROM information_schema.statistics WHERE table_schema = 'urban_mobility';