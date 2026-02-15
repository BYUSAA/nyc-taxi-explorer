// Mock data for NYC Taxi Explorer (No Node.js needed)

const mockData = {
    // KPI Stats
    stats: {
        total_trips: 6518458,
        total_revenue: 125430987.50,
        avg_fare: 19.25,
        avg_distance: 3.2
    },

    // Hourly patterns
    hourlyPatterns: [
        { hour_of_day: 0, trip_count: 12450, avg_fare: 18.50 },
        { hour_of_day: 1, trip_count: 8760, avg_fare: 19.20 },
        { hour_of_day: 2, trip_count: 5430, avg_fare: 20.10 },
        { hour_of_day: 3, trip_count: 3210, avg_fare: 22.30 },
        { hour_of_day: 4, trip_count: 2890, avg_fare: 23.40 },
        { hour_of_day: 5, trip_count: 4560, avg_fare: 21.50 },
        { hour_of_day: 6, trip_count: 12340, avg_fare: 18.90 },
        { hour_of_day: 7, trip_count: 24560, avg_fare: 16.80 },
        { hour_of_day: 8, trip_count: 32450, avg_fare: 15.90 },
        { hour_of_day: 9, trip_count: 28900, avg_fare: 16.20 },
        { hour_of_day: 10, trip_count: 23450, avg_fare: 17.10 },
        { hour_of_day: 11, trip_count: 19870, avg_fare: 18.00 },
        { hour_of_day: 12, trip_count: 21340, avg_fare: 18.40 },
        { hour_of_day: 13, trip_count: 22450, avg_fare: 18.60 },
        { hour_of_day: 14, trip_count: 23450, avg_fare: 18.90 },
        { hour_of_day: 15, trip_count: 25670, avg_fare: 19.20 },
        { hour_of_day: 16, trip_count: 29870, avg_fare: 19.80 },
        { hour_of_day: 17, trip_count: 35670, avg_fare: 20.50 },
        { hour_of_day: 18, trip_count: 37890, avg_fare: 21.20 },
        { hour_of_day: 19, trip_count: 34560, avg_fare: 22.10 },
        { hour_of_day: 20, trip_count: 29870, avg_fare: 22.80 },
        { hour_of_day: 21, trip_count: 25670, avg_fare: 23.20 },
        { hour_of_day: 22, trip_count: 21340, avg_fare: 22.50 },
        { hour_of_day: 23, trip_count: 16780, avg_fare: 20.80 }
    ],

    // Borough statistics
    boroughStats: [
        { borough: 'Manhattan', trip_count: 4234567, total_revenue: 82345678, avg_fare: 21.50, avg_distance: 2.8 },
        { borough: 'Brooklyn', trip_count: 1234567, total_revenue: 22345678, avg_fare: 18.20, avg_distance: 4.2 },
        { borough: 'Queens', trip_count: 654321, total_revenue: 11234567, avg_fare: 17.80, avg_distance: 5.1 },
        { borough: 'Bronx', trip_count: 234567, total_revenue: 4123456, avg_fare: 16.50, avg_distance: 3.9 },
        { borough: 'Staten Island', trip_count: 123456, total_revenue: 2123456, avg_fare: 15.90, avg_distance: 6.5 }
    ],

    // Zones data (from taxi_zone_lookup.csv)
    zones: [
        { location_id: 1, borough: 'EWR', zone_name: 'Newark Airport', service_zone: 'EWR' },
        { location_id: 2, borough: 'Queens', zone_name: 'Jamaica Bay', service_zone: 'Boro Zone' },
        { location_id: 3, borough: 'Bronx', zone_name: 'Allerton/Pelham Gardens', service_zone: 'Boro Zone' },
        { location_id: 4, borough: 'Manhattan', zone_name: 'Alphabet City', service_zone: 'Yellow Zone' },
        { location_id: 5, borough: 'Staten Island', zone_name: 'Arden Heights', service_zone: 'Boro Zone' },
        { location_id: 6, borough: 'Staten Island', zone_name: 'Arrochar/Fort Wadsworth', service_zone: 'Boro Zone' },
        { location_id: 7, borough: 'Queens', zone_name: 'Astoria', service_zone: 'Boro Zone' },
        { location_id: 8, borough: 'Queens', zone_name: 'Astoria Park', service_zone: 'Boro Zone' },
        { location_id: 9, borough: 'Queens', zone_name: 'Auburndale', service_zone: 'Boro Zone' },
        { location_id: 10, borough: 'Queens', zone_name: 'Baisley Park', service_zone: 'Boro Zone' },
        { location_id: 11, borough: 'Brooklyn', zone_name: 'Bath Beach', service_zone: 'Boro Zone' },
        { location_id: 12, borough: 'Manhattan', zone_name: 'Battery Park', service_zone: 'Yellow Zone' },
        { location_id: 13, borough: 'Manhattan', zone_name: 'Battery Park City', service_zone: 'Yellow Zone' },
        { location_id: 14, borough: 'Brooklyn', zone_name: 'Bay Ridge', service_zone: 'Boro Zone' },
        { location_id: 15, borough: 'Queens', zone_name: 'Bay Terrace/Fort Totten', service_zone: 'Boro Zone' },
        { location_id: 16, borough: 'Queens', zone_name: 'Bayside', service_zone: 'Boro Zone' },
        { location_id: 17, borough: 'Brooklyn', zone_name: 'Bedford', service_zone: 'Boro Zone' },
        { location_id: 18, borough: 'Bronx', zone_name: 'Bedford Park', service_zone: 'Boro Zone' },
        { location_id: 19, borough: 'Queens', zone_name: 'Bellerose', service_zone: 'Boro Zone' },
        { location_id: 20, borough: 'Bronx', zone_name: 'Belmont', service_zone: 'Boro Zone' }
        // Add more zones as needed (265 total)
    ],

    // Sample trips
    trips: [
        { 
            trip_id: 1, 
            pickup_datetime: '2024-01-15 08:30:00', 
            dropoff_datetime: '2024-01-15 08:45:00',
            pickup_zone: 'Times Square', 
            pickup_borough: 'Manhattan',
            dropoff_zone: 'Central Park', 
            dropoff_borough: 'Manhattan',
            trip_distance: 2.5, 
            total_amount: 18.50,
            tip_amount: 3.20,
            passenger_count: 1
        },
        { 
            trip_id: 2, 
            pickup_datetime: '2024-01-15 09:15:00', 
            dropoff_datetime: '2024-01-15 09:40:00',
            pickup_zone: 'Brooklyn Heights', 
            pickup_borough: 'Brooklyn',
            dropoff_zone: 'Wall Street', 
            dropoff_borough: 'Manhattan',
            trip_distance: 4.2, 
            total_amount: 28.75,
            tip_amount: 5.50,
            passenger_count: 2
        },
        { 
            trip_id: 3, 
            pickup_datetime: '2024-01-15 10:00:00', 
            dropoff_datetime: '2024-01-15 10:25:00',
            pickup_zone: 'JFK Airport', 
            pickup_borough: 'Queens',
            dropoff_zone: 'Times Square', 
            dropoff_borough: 'Manhattan',
            trip_distance: 15.8, 
            total_amount: 52.30,
            tip_amount: 8.00,
            passenger_count: 3
        },
        { 
            trip_id: 4, 
            pickup_datetime: '2024-01-15 11:30:00', 
            dropoff_datetime: '2024-01-15 11:50:00',
            pickup_zone: 'Columbia University', 
            pickup_borough: 'Manhattan',
            dropoff_zone: 'Harlem', 
            dropoff_borough: 'Manhattan',
            trip_distance: 3.1, 
            total_amount: 16.80,
            tip_amount: 2.50,
            passenger_count: 1
        },
        { 
            trip_id: 5, 
            pickup_datetime: '2024-01-15 12:45:00', 
            dropoff_datetime: '2024-01-15 13:15:00',
            pickup_zone: 'Coney Island', 
            pickup_borough: 'Brooklyn',
            dropoff_zone: 'Williamsburg', 
            dropoff_borough: 'Brooklyn',
            trip_distance: 8.3, 
            total_amount: 32.40,
            tip_amount: 6.00,
            passenger_count: 4
        }
    ],

    // Insights
    insights: [
        {
            id: 1,
            title: '🚦 Rush Hour Revenue Premium',
            description: 'Rush hour trips generate 18.3% higher revenue per hour compared to off-peak periods.',
            data: {
                rush_hour_revenue_per_hour: '$57.80',
                off_peak_revenue_per_hour: '$48.85',
                premium_percentage: '18.3%',
                rush_hour_trips: '1,625,430',
                rush_hour_revenue: '$28.5M'
            },
            interpretation: 'Drivers can maximize earnings by focusing on rush hour periods (7-9 AM, 5-7 PM weekdays).'
        },
        {
            id: 2,
            title: '💵 Cross-Borough Tip Premium',
            description: 'Cross-borough trips receive 45% higher tip percentages compared to trips within the same borough.',
            data: {
                cross_borough_tip_pct: '17.3%',
                same_borough_tip_pct: '11.9%',
                tip_difference: '45%',
                cross_borough_trips: '1,245,780'
            },
            interpretation: 'Passengers on longer, cross-borough journeys tend to tip more generously.'
        },
        {
            id: 3,
            title: '🌆 Weekend Leisure Travel',
            description: 'Weekend trips are 34% longer and carry 28% more passengers.',
            data: {
                weekend_distance: '4.3 mi',
                weekday_distance: '3.2 mi',
                distance_difference: '34%',
                weekend_passengers: '1.8',
                weekday_passengers: '1.4'
            },
            interpretation: 'Weekends show a shift from solo commuter trips to group leisure travel.'
        }
    ],

    // Admin users
    users: [
        { user_id: 1, username: 'admin', email: 'admin@urbanmobility.com', role: 'admin', created_at: '2024-01-01', last_login: '2024-01-15 10:30:00' },
        { user_id: 2, username: 'john_doe', email: 'john@example.com', role: 'viewer', created_at: '2024-01-02', last_login: '2024-01-14 09:15:00' },
        { user_id: 3, username: 'jane_smith', email: 'jane@example.com', role: 'viewer', created_at: '2024-01-03', last_login: '2024-01-13 14:20:00' }
    ],

    // Audit logs
    auditLogs: [
        { created_at: '2024-01-15 09:30:00', username: 'admin', action: 'CREATE', table_name: 'trips', record_id: 101, details: 'Created new trip' },
        { created_at: '2024-01-15 10:15:00', username: 'admin', action: 'UPDATE', table_name: 'zones', record_id: 45, details: 'Updated zone name' },
        { created_at: '2024-01-15 11:00:00', username: 'john_doe', action: 'VIEW', table_name: 'reports', record_id: null, details: 'Viewed analytics' },
        { created_at: '2024-01-15 11:45:00', username: 'admin', action: 'DELETE', table_name: 'trips', record_id: 67, details: 'Deleted test trip' }
    ],

    // Cleaning logs
    cleaningLogs: [
        { batch_date: '2024-01-15', records_processed: 100000, records_valid: 87500, records_excluded: 12500, exclusion_reason: '{"missing_location": 5000, "invalid_fare": 3500, "duplicate": 2500, "outlier": 1500}' },
        { batch_date: '2024-01-14', records_processed: 95000, records_valid: 83100, records_excluded: 11900, exclusion_reason: '{"missing_location": 4800, "invalid_fare": 3200, "duplicate": 2400, "outlier": 1500}' },
        { batch_date: '2024-01-13', records_processed: 110000, records_valid: 96200, records_excluded: 13800, exclusion_reason: '{"missing_location": 5500, "invalid_fare": 3800, "duplicate": 2800, "outlier": 1700}' }
    ]
};

// Mock API functions
const MockAPI = {
    // Health check
    async checkHealth() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected (mock)',
            uptime: 3600
        };
    },

    // Stats
    async getStats() {
        return { success: true, data: mockData.stats };
    },

    // Hourly patterns
    async getHourlyPatterns() {
        return { success: true, data: mockData.hourlyPatterns };
    },

    // Borough stats
    async getBoroughStats() {
        return { success: true, data: mockData.boroughStats };
    },

    // Zones
    async getZones() {
        return { success: true, data: mockData.zones, count: mockData.zones.length };
    },

    // Trips with pagination
    async getTrips(params = {}) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 50;
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            success: true,
            data: mockData.trips.slice(start, end),
            pagination: {
                page: page,
                limit: limit,
                total: mockData.trips.length,
                pages: Math.ceil(mockData.trips.length / limit)
            }
        };
    },

    // Insights
    async getInsights() {
        return { success: true, insights: mockData.insights };
    },

    // Users (admin)
    async getUsers() {
        return { success: true, data: mockData.users };
    },

    // Audit logs
    async getAuditLogs(page = 1) {
        return { success: true, data: mockData.auditLogs };
    },

    // Cleaning logs
    async getCleaningLogs() {
        return { success: true, data: mockData.cleaningLogs };
    },

    // Login
    async login(username, password) {
        if (username === 'admin' && password === 'admin123') {
            return {
                success: true,
                token: 'mock-jwt-token-12345',
                user: {
                    id: 1,
                    username: 'admin',
                    email: 'admin@urbanmobility.com',
                    role: 'admin'
                }
            };
        }
        throw new Error('Invalid credentials');
    }
};