const API = {
    baseUrl: '',
    token: localStorage.getItem('token'),

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    },

    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // ========== AUTH ==========
    async login(username, password) {
        const data = await this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    },

    // ========== PUBLIC ENDPOINTS ==========
    async getTrips(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/api/trips?${queryString}`);
    },

    async getTrip(id) {
        return this.request(`/api/trips/${id}`);
    },

    async getStats() {
        return this.request('/api/trips/stats');
    },

    async getTopFares(limit = 10) {
        return this.request(`/api/trips/top-fares/${limit}`);
    },

    async getSortedTrips(field, limit = 1000) {
        return this.request(`/api/trips/sorted/${field}?limit=${limit}`);
    },

    async getPopularRoutes(limit = 10) {
        return this.request(`/api/trips/popular-routes?limit=${limit}`);
    },

    async getZones() {
        return this.request('/api/zones');
    },

    async getZone(id) {
        return this.request(`/api/zones/${id}`);
    },

    async getZonesByBorough(borough) {
        return this.request(`/api/zones/borough/${borough}`);
    },

    async getZoneStats(id) {
        return this.request(`/api/zones/stats/${id}`);
    },

    async getHourlyPatterns() {
        return this.request('/api/analytics/hourly');
    },

    async getBoroughStats() {
        return this.request('/api/analytics/boroughs');
    },

    async getDailyTrends() {
        return this.request('/api/analytics/trends');
    },

    async getInsights() {
        return this.request('/api/analytics/insights');
    },

    async getPaymentTypes() {
        return this.request('/api/analytics/payment-types');
    },

    async getRegression() {
        return this.request('/api/analytics/regression');
    },

    // ========== PROTECTED ENDPOINTS (Admin) ==========
    async createTrip(tripData) {
        return this.request('/api/trips', {
            method: 'POST',
            body: JSON.stringify(tripData)
        });
    },

    async updateTrip(id, tripData) {
        return this.request(`/api/trips/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tripData)
        });
    },

    async deleteTrip(id) {
        return this.request(`/api/trips/${id}`, {
            method: 'DELETE'
        });
    },

    async batchCreateTrips(trips) {
        return this.request('/api/trips/batch', {
            method: 'POST',
            body: JSON.stringify({ trips })
        });
    },

    async createZone(zoneData) {
        return this.request('/api/zones', {
            method: 'POST',
            body: JSON.stringify(zoneData)
        });
    },

    async updateZone(id, zoneData) {
        return this.request(`/api/zones/${id}`, {
            method: 'PUT',
            body: JSON.stringify(zoneData)
        });
    },

    async deleteZone(id) {
        return this.request(`/api/zones/${id}`, {
            method: 'DELETE'
        });
    },

    // ========== ADMIN ENDPOINTS ==========
    async getUsers() {
        return this.request('/api/admin/users');
    },

    async createUser(userData) {
        return this.request('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async updateUser(id, userData) {
        return this.request(`/api/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    async deleteUser(id) {
        return this.request(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
    },

    async getAuditLogs(page = 1, limit = 50) {
        return this.request(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
    },

    async getDatabaseStats() {
        return this.request('/api/admin/database-stats');
    },

    async optimizeDatabase() {
        return this.request('/api/admin/optimize', {
            method: 'POST'
        });
    },

    async getCleaningLogs() {
        return this.request('/api/admin/cleaning-logs');
    },

    async getSystemHealth() {
        return this.request('/api/admin/system-health');
    },

    // ========== HEALTH CHECK ==========
    async checkHealth() {
        return this.request('/api/health');
    }
};