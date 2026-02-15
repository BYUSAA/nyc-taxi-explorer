// Mock API for frontend-only mode
const API = {
    // Store data in localStorage
    initStorage() {
        if (!localStorage.getItem('trips')) {
            localStorage.setItem('trips', JSON.stringify([]));
        }
        if (!localStorage.getItem('zones')) {
            // Load zones from the CSV data
            const zones = generateZones();
            localStorage.setItem('zones', JSON.stringify(zones));
        }
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([
                { id: 1, username: 'admin', password: 'admin123', role: 'admin', email: 'admin@example.com' }
            ]));
        }
    },

    // ========== AUTH ==========
    async login(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            const token = btoa(JSON.stringify({ id: user.id, role: user.role }));
            localStorage.setItem('token', token);
            return { success: true, token, user };
        }
        throw new Error('Invalid credentials');
    },

    // ========== TRIPS ==========
    async getTrips(params = {}) {
        let trips = JSON.parse(localStorage.getItem('trips') || '[]');
        
        // Add mock data if empty
        if (trips.length === 0) {
            trips = generateMockTrips();
            localStorage.setItem('trips', JSON.stringify(trips));
        }
        
        // Apply filters
        if (params.borough) {
            trips = trips.filter(t => t.pickup_borough === params.borough);
        }
        
        return {
            success: true,
            data: trips.slice(0, params.limit || 50),
            pagination: {
                page: 1,
                limit: params.limit || 50,
                total: trips.length,
                pages: Math.ceil(trips.length / (params.limit || 50))
            }
        };
    },

    async getStats() {
        const trips = JSON.parse(localStorage.getItem('trips') || '[]');
        const totalRevenue = trips.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        
        return {
            success: true,
            data: {
                total_trips: trips.length || 15423,
                total_revenue: totalRevenue || 285432.50,
                avg_fare: (totalRevenue / (trips.length || 1)).toFixed(2) || 18.50,
                avg_distance: 3.2,
                avg_tip: 4.50,
                days_with_data: 30
            }
        };
    },

    // ========== ZONES ==========
    async getZones() {
        const zones = JSON.parse(localStorage.getItem('zones') || '[]');
        return {
            success: true,
            data: zones,
            count: zones.length
        };
    },

    // ========== ANALYTICS ==========
    async getHourlyPatterns() {
        return {
            success: true,
            data: generateHourlyData()
        };
    },

    async getBoroughStats() {
        return {
            success: true,
            data: [
                { borough: 'Manhattan', trip_count: 8452, total_revenue: 168450, avg_fare: 19.95, avg_distance: 2.8 },
                { borough: 'Brooklyn', trip_count: 3241, total_revenue: 58234, avg_fare: 17.98, avg_distance: 4.2 },
                { borough: 'Queens', trip_count: 2345, total_revenue: 45678, avg_fare: 19.48, avg_distance: 6.5 },
                { borough: 'Bronx', trip_count: 845, total_revenue: 15234, avg_fare: 18.03, avg_distance: 5.1 },
                { borough: 'Staten Island', trip_count: 540, total_revenue: 10234, avg_fare: 18.95, avg_distance: 8.4 }
            ]
        };
    },

    async getInsights() {
        return {
            success: true,
            insights: [
                {
                    id: 1,
                    title: '🚦 Rush Hour Revenue Premium',
                    description: 'Rush hour trips generate 18% higher revenue per hour compared to off-peak periods.',
                    data: {
                        rush_hour_revenue_per_hour: '$57.80',
                        off_peak_revenue_per_hour: '$48.85',
                        premium_percentage: '18.3%'
                    },
                    interpretation: 'Drive during 7-9 AM and 5-7 PM for maximum earnings.'
                },
                {
                    id: 2,
                    title: '💵 Cross-Borough Tip Premium',
                    description: 'Cross-borough trips receive 45% higher tip percentages.',
                    data: {
                        cross_borough_tip_pct: '17.3%',
                        same_borough_tip_pct: '11.9%',
                        tip_difference: '45%'
                    },
                    interpretation: 'Accept longer trips for better tips.'
                },
                {
                    id: 3,
                    title: '🌆 Weekend Leisure Travel',
                    description: 'Weekend trips are 34% longer with 28% more passengers.',
                    data: {
                        weekend_distance: '4.3 mi',
                        weekday_distance: '3.2 mi',
                        weekend_passengers: '1.8',
                        weekday_passengers: '1.4'
                    },
                    interpretation: 'Weekends are for groups - consider larger vehicles.'
                }
            ]
        };
    },

    // Admin endpoints
    async getUsers() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return { success: true, data: users };
    },

    async createUser(userData) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const newUser = { id: users.length + 1, ...userData };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, user_id: newUser.id };
    },

    async deleteUser(id) {
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        users = users.filter(u => u.id != id);
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true };
    }
};

// Helper functions to generate mock data
function generateZones() {
    const zones = [];
    const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    for (let i = 1; i <= 265; i++) {
        zones.push({
            location_id: i,
            borough: boroughs[Math.floor(Math.random() * boroughs.length)],
            zone_name: `Zone ${i}`,
            service_zone: Math.random() > 0.5 ? 'Yellow Zone' : 'Boro Zone'
        });
    }
    return zones;
}

function generateMockTrips(count = 100) {
    const trips = [];
    const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    const zones = ['Downtown', 'Midtown', 'Uptown', 'Airport', 'Residential'];
    
    for (let i = 1; i <= count; i++) {
        const pickupBorough = boroughs[Math.floor(Math.random() * boroughs.length)];
        const dropoffBorough = boroughs[Math.floor(Math.random() * boroughs.length)];
        const fare = 15 + Math.random() * 35;
        
        trips.push({
            trip_id: i,
            pickup_datetime: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            dropoff_datetime: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            pickup_zone: zones[Math.floor(Math.random() * zones.length)],
            pickup_borough: pickupBorough,
            dropoff_zone: zones[Math.floor(Math.random() * zones.length)],
            dropoff_borough: dropoffBorough,
            trip_distance: (2 + Math.random() * 8).toFixed(2),
            total_amount: fare.toFixed(2),
            tip_amount: (fare * 0.15).toFixed(2),
            passenger_count: Math.floor(1 + Math.random() * 4)
        });
    }
    return trips;
}

function generateHourlyData() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        hours.push({
            hour_of_day: i,
            trip_count: 100 + Math.floor(Math.random() * 900),
            avg_fare: (15 + Math.random() * 10).toFixed(2),
            avg_distance: (2 + Math.random() * 3).toFixed(2)
        });
    }
    return hours;
}

// Initialize storage
API.initStorage();