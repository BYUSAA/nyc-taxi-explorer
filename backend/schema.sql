-- =============================================
-- NYC TAXI DATA EXPLORER - COMPLETE DATABASE SCHEMA
-- =============================================

DROP DATABASE IF EXISTS urban_mobility;
CREATE DATABASE urban_mobility;
USE urban_mobility;

-- =============================================
-- ZONES TABLE (Dimension)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- TRIPS TABLE (Fact)
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
    payment_type TINYINT DEFAULT 1,
    fare_amount DECIMAL(8,2) DEFAULT 0,
    extra DECIMAL(8,2) DEFAULT 0,
    mta_tax DECIMAL(8,2) DEFAULT 0.5,
    tip_amount DECIMAL(8,2) DEFAULT 0,
    tolls_amount DECIMAL(8,2) DEFAULT 0,
    improvement_surcharge DECIMAL(8,2) DEFAULT 0.3,
    total_amount DECIMAL(8,2) DEFAULT 0,
    congestion_surcharge DECIMAL(8,2) DEFAULT 2.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_pickup_datetime (pickup_datetime),
    INDEX idx_dropoff_datetime (dropoff_datetime),
    INDEX idx_pickup_location (pickup_location_id),
    INDEX idx_dropoff_location (dropoff_location_id),
    INDEX idx_trip_distance (trip_distance),
    INDEX idx_total_amount (total_amount),
    INDEX idx_payment_type (payment_type),
    INDEX idx_composite_loc (pickup_location_id, dropoff_location_id),
    
    FOREIGN KEY (pickup_location_id) REFERENCES zones(location_id) ON DELETE SET NULL,
    FOREIGN KEY (dropoff_location_id) REFERENCES zones(location_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- USERS TABLE (For Admin Authentication)
-- =============================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('admin', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- AGGREGATES TABLE (For dashboard performance)
-- =============================================
CREATE TABLE trip_aggregates (
    agg_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    agg_date DATE NOT NULL,
    agg_hour TINYINT,
    pickup_borough VARCHAR(50),
    trip_count INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_fare DECIMAL(8,2) DEFAULT 0,
    avg_distance DECIMAL(8,2) DEFAULT 0,
    avg_tip DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_agg (agg_date, agg_hour, pickup_borough)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- DATA CLEANING LOG
-- =============================================
CREATE TABLE data_cleaning_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_date DATE NOT NULL,
    records_processed INT DEFAULT 0,
    records_valid INT DEFAULT 0,
    records_excluded INT DEFAULT 0,
    exclusion_reason JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_date (batch_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- AUDIT LOG (For tracking admin actions)
-- =============================================
CREATE TABLE audit_log (
    audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id BIGINT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Hourly patterns view
CREATE VIEW hourly_patterns AS
SELECT 
    HOUR(pickup_datetime) as hour_of_day,
    COUNT(*) as trip_count,
    ROUND(AVG(total_amount), 2) as avg_fare,
    ROUND(AVG(trip_distance), 2) as avg_distance,
    ROUND(AVG(tip_amount), 2) as avg_tip,
    ROUND(SUM(total_amount), 2) as total_revenue
FROM trips
WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY HOUR(pickup_datetime)
ORDER BY hour_of_day;

-- Borough stats view
CREATE VIEW borough_stats AS
SELECT 
    z.borough,
    COUNT(t.trip_id) as trip_count,
    ROUND(SUM(t.total_amount), 2) as total_revenue,
    ROUND(AVG(t.total_amount), 2) as avg_fare,
    ROUND(AVG(t.trip_distance), 2) as avg_distance,
    ROUND(AVG(t.tip_amount), 2) as avg_tip
FROM trips t
JOIN zones z ON t.pickup_location_id = z.location_id
WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY z.borough;

-- Popular routes view
CREATE VIEW popular_routes AS
SELECT 
    z1.borough as pickup_borough,
    z1.zone_name as pickup_zone,
    z2.borough as dropoff_borough,
    z2.zone_name as dropoff_zone,
    COUNT(*) as trip_count,
    ROUND(AVG(t.total_amount), 2) as avg_fare,
    ROUND(AVG(t.trip_distance), 2) as avg_distance,
    ROUND(AVG(t.tip_amount), 2) as avg_tip
FROM trips t
JOIN zones z1 ON t.pickup_location_id = z1.location_id
JOIN zones z2 ON t.dropoff_location_id = z2.location_id
WHERE t.pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY z1.borough, z1.zone_name, z2.borough, z2.zone_name
ORDER BY trip_count DESC
LIMIT 100;

-- Daily trends view
CREATE VIEW daily_trends AS
SELECT 
    DATE(pickup_datetime) as trip_date,
    COUNT(*) as trip_count,
    ROUND(SUM(total_amount), 2) as daily_revenue,
    ROUND(AVG(total_amount), 2) as avg_fare,
    ROUND(AVG(trip_distance), 2) as avg_distance
FROM trips
WHERE pickup_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(pickup_datetime)
ORDER BY trip_date;

-- =============================================
-- STORED PROCEDURES
-- =============================================

DELIMITER //

-- Procedure to update aggregates
CREATE PROCEDURE update_daily_aggregates(IN target_date DATE)
BEGIN
    INSERT INTO trip_aggregates (agg_date, agg_hour, pickup_borough, trip_count, total_revenue, avg_fare, avg_distance, avg_tip)
    SELECT 
        DATE(pickup_datetime) as agg_date,
        HOUR(pickup_datetime) as agg_hour,
        z.borough as pickup_borough,
        COUNT(*) as trip_count,
        ROUND(SUM(t.total_amount), 2) as total_revenue,
        ROUND(AVG(t.total_amount), 2) as avg_fare,
        ROUND(AVG(t.trip_distance), 2) as avg_distance,
        ROUND(AVG(t.tip_amount), 2) as avg_tip
    FROM trips t
    JOIN zones z ON t.pickup_location_id = z.location_id
    WHERE DATE(t.pickup_datetime) = target_date
    GROUP BY DATE(pickup_datetime), HOUR(pickup_datetime), z.borough
    ON DUPLICATE KEY UPDATE
        trip_count = VALUES(trip_count),
        total_revenue = VALUES(total_revenue),
        avg_fare = VALUES(avg_fare),
        avg_distance = VALUES(avg_distance),
        avg_tip = VALUES(avg_tip),
        updated_at = CURRENT_TIMESTAMP;
END //

DELIMITER ;

-- =============================================
-- INSERT DEFAULT ADMIN USER
-- =============================================
-- Password: admin123 (you should change this)
INSERT INTO users (username, password_hash, email, role) VALUES 
('admin', '$2b$10$YourHashedPasswordHere', 'admin@urbanmobility.com', 'admin');

-- =============================================
-- TRIGGERS
-- =============================================

DELIMITER //

-- Trigger to validate trip data before insert
CREATE TRIGGER validate_trip_before_insert
BEFORE INSERT ON trips
FOR EACH ROW
BEGIN
    -- Ensure positive values
    IF NEW.trip_distance < 0 THEN
        SET NEW.trip_distance = 0;
    END IF;
    
    IF NEW.total_amount < 0 THEN
        SET NEW.total_amount = 0;
    END IF;
    
    -- Ensure valid passenger count
    IF NEW.passenger_count < 0 OR NEW.passenger_count > 6 THEN
        SET NEW.passenger_count = 1;
    END IF;
    
    -- Ensure dropoff after pickup
    IF NEW.dropoff_datetime <= NEW.pickup_datetime THEN
        SET NEW.dropoff_datetime = DATE_ADD(NEW.pickup_datetime, INTERVAL 1 MINUTE);
    END IF;
END //

DELIMITER ;

-- =============================================
-- DATABASE STATISTICS
-- =============================================

SELECT 'Database schema created successfully' as Status;
SELECT 'Tables: zones, trips, users, trip_aggregates, data_cleaning_log, audit_log' as Tables;
SELECT 'Views: hourly_patterns, borough_stats, popular_routes, daily_trends' as Views;