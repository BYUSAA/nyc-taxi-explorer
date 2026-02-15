// Admin state
let currentUser = null;
let token = localStorage.getItem('adminToken');

// Check authentication on load
document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    loadAdminData();
});

// Load all admin data
async function loadAdminData() {
    showLoading();
    
    try {
        await Promise.all([
            loadSystemStats(),
            loadTrips(),
            loadZones(),
            loadUsers(),
            loadAuditLogs(),
            loadDatabaseStats()
        ]);
        
        setupCharts();
        
    } catch (error) {
        console.error('Failed to load admin data:', error);
        showError('Failed to load data');
    }
}

// Load system stats
async function loadSystemStats() {
    try {
        const response = await fetch('/api/health', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-label">Total Trips</div>
                <div class="stat-value">${formatNumber(data.stats?.trips || 0)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Zones</div>
                <div class="stat-value">${data.stats?.zones || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Users</div>
                <div class="stat-value">${data.stats?.users || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-value">${formatUptime(data.uptime)}</div>
            </div>
        `;
        
        document.getElementById('systemStats').innerHTML = statsHtml;
        
        // Update health status
        const healthDiv = document.getElementById('healthStatus');
        healthDiv.innerHTML = data.status === 'healthy' 
            ? '<span class="health-good">✓ System Healthy</span>'
            : '<span class="health-bad">⚠ System Issues</span>';
            
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load trips with pagination
let currentTripPage = 1;
async function loadTrips(page = 1) {
    try {
        const response = await fetch(`/api/trips?page=${page}&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            displayTrips(data.data);
            setupPagination('tripsPagination', data.pagination, (p) => {
                currentTripPage = p;
                loadTrips(p);
            });
        }
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

// Display trips in table
function displayTrips(trips) {
    const tbody = document.getElementById('tripsTableBody');
    
    if (!trips || trips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-message">No trips found</td></tr>';
        return;
    }
    
    tbody.innerHTML = trips.map(trip => `
        <tr>
            <td>${trip.trip_id}</td>
            <td>${new Date(trip.pickup_datetime).toLocaleString()}</td>
            <td>${trip.pickup_zone || 'Unknown'}</td>
            <td>${trip.dropoff_zone || 'Unknown'}</td>
            <td>${trip.trip_distance} mi</td>
            <td>$${trip.total_amount}</td>
            <td class="actions">
                <button onclick="editTrip(${trip.trip_id})" class="btn-edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTrip(${trip.trip_id})" class="btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load zones
async function loadZones() {
    try {
        const response = await fetch('/api/zones', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            displayZones(data.data);
        }
    } catch (error) {
        console.error('Error loading zones:', error);
    }
}

// Display zones in table
function displayZones(zones) {
    const tbody = document.getElementById('zonesTableBody');
    
    tbody.innerHTML = zones.map(zone => `
        <tr>
            <td>${zone.location_id}</td>
            <td>${zone.borough}</td>
            <td>${zone.zone_name}</td>
            <td>${zone.service_zone || '-'}</td>
            <td class="actions">
                <button onclick="editZone(${zone.location_id})" class="btn-edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteZone(${zone.location_id})" class="btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="badge ${user.role}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
            <td class="actions">
                <button onclick="editUser(${user.user_id})" class="btn-edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteUser(${user.user_id})" class="btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load audit logs
let currentAuditPage = 1;
async function loadAuditLogs(page = 1) {
    try {
        const response = await fetch(`/api/admin/audit-logs?page=${page}&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            displayAuditLogs(data.data);
            setupPagination('auditPagination', data.pagination, (p) => {
                currentAuditPage = p;
                loadAuditLogs(p);
            });
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

// Display audit logs
function displayAuditLogs(logs) {
    const tbody = document.getElementById('auditTableBody');
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${new Date(log.created_at).toLocaleString()}</td>
            <td>${log.username || 'System'}</td>
            <td><span class="badge ${log.action.toLowerCase()}">${log.action}</span></td>
            <td>${log.table_name || '-'}</td>
            <td>${log.record_id || '-'}</td>
            <td>
                ${log.old_values ? '<small>Old: ' + JSON.stringify(log.old_values).substring(0, 50) + '...</small><br>' : ''}
                ${log.new_values ? '<small>New: ' + JSON.stringify(log.new_values).substring(0, 50) + '...</small>' : ''}
            </td>
        </tr>
    `).join('');
}

// Load database stats
async function loadDatabaseStats() {
    try {
        const response = await fetch('/api/admin/database-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            displayDatabaseStats(data.data);
        }
    } catch (error) {
        console.error('Error loading database stats:', error);
    }
}

// Display database stats
function displayDatabaseStats(stats) {
    const statsDiv = document.getElementById('dbStats');
    
    if (!stats || !stats.totals) return;
    
    const totalSizeMB = stats.totals.total_size / (1024 * 1024);
    const dataSizeMB = stats.totals.data_size / (1024 * 1024);
    const indexSizeMB = stats.totals.index_size / (1024 * 1024);
    
    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Size</div>
            <div class="stat-value">${totalSizeMB.toFixed(2)} MB</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Data Size</div>
            <div class="stat-value">${dataSizeMB.toFixed(2)} MB</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Index Size</div>
            <div class="stat-value">${indexSizeMB.toFixed(2)} MB</div>
        </div>
    `;
    
    // Display table stats
    const tablesDiv = document.createElement('div');
    tablesDiv.className = 'tables-stats';
    tablesDiv.innerHTML = '<h3>Table Statistics</h3>';
    
    const tableList = stats.tables.map(table => `
        <div class="table-stat-row">
            <span><strong>${table.table_name}</strong></span>
            <span>${formatNumber(table.table_rows)} rows</span>
            <span>${(table.data_length / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
    `).join('');
    
    tablesDiv.innerHTML += tableList;
    statsDiv.appendChild(tablesDiv);
}

// Trip CRUD operations
async function showAddTripModal() {
    document.getElementById('tripModalTitle').textContent = 'Add Trip';
    document.getElementById('tripForm').reset();
    document.getElementById('tripId').value = '';
    
    // Load zones for dropdowns
    await loadZoneDropdowns();
    
    openModal('tripModal');
}

async function editTrip(id) {
    try {
        const response = await fetch(`/api/trips/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const trip = data.data;
            document.getElementById('tripModalTitle').textContent = 'Edit Trip';
            document.getElementById('tripId').value = trip.trip_id;
            
            // Format datetime for input
            document.getElementById('pickupDatetime').value = trip.pickup_datetime.slice(0, 16);
            document.getElementById('dropoffDatetime').value = trip.dropoff_datetime.slice(0, 16);
            
            await loadZoneDropdowns();
            document.getElementById('pickupLocationId').value = trip.pickup_location_id;
            document.getElementById('dropoffLocationId').value = trip.dropoff_location_id;
            document.getElementById('tripDistance').value = trip.trip_distance;
            document.getElementById('fareAmount').value = trip.fare_amount;
            document.getElementById('tipAmount').value = trip.tip_amount;
            document.getElementById('passengerCount').value = trip.passenger_count;
            
            openModal('tripModal');
        }
    } catch (error) {
        console.error('Error loading trip:', error);
        showError('Failed to load trip');
    }
}

async function saveTrip(event) {
    event.preventDefault();
    
    const tripData = {
        pickup_datetime: document.getElementById('pickupDatetime').value,
        dropoff_datetime: document.getElementById('dropoffDatetime').value,
        pickup_location_id: parseInt(document.getElementById('pickupLocationId').value),
        dropoff_location_id: parseInt(document.getElementById('dropoffLocationId').value),
        trip_distance: parseFloat(document.getElementById('tripDistance').value),
        fare_amount: parseFloat(document.getElementById('fareAmount').value),
        tip_amount: parseFloat(document.getElementById('tipAmount').value),
        passenger_count: parseInt(document.getElementById('passengerCount').value),
        total_amount: parseFloat(document.getElementById('fareAmount').value) + 
                     parseFloat(document.getElementById('tipAmount').value) + 2.8 // approximate
    };
    
    const tripId = document.getElementById('tripId').value;
    const url = tripId ? `/api/trips/${tripId}` : '/api/trips';
    const method = tripId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(tripData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('tripModal');
            loadTrips(currentTripPage);
            showSuccess(tripId ? 'Trip updated' : 'Trip created');
        } else {
            showError(data.error || 'Failed to save trip');
        }
    } catch (error) {
        console.error('Error saving trip:', error);
        showError('Failed to save trip');
    }
}

async function deleteTrip(id) {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    
    try {
        const response = await fetch(`/api/trips/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadTrips(currentTripPage);
            showSuccess('Trip deleted');
        } else {
            showError(data.error || 'Failed to delete trip');
        }
    } catch (error) {
        console.error('Error deleting trip:', error);
        showError('Failed to delete trip');
    }
}

// Zone CRUD operations
async function showAddZoneModal() {
    document.getElementById('zoneModalTitle').textContent = 'Add Zone';
    document.getElementById('zoneForm').reset();
    document.getElementById('zoneId').value = '';
    openModal('zoneModal');
}

async function editZone(id) {
    try {
        const response = await fetch(`/api/zones/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const zone = data.data;
            document.getElementById('zoneModalTitle').textContent = 'Edit Zone';
            document.getElementById('zoneId').value = zone.location_id;
            document.getElementById('locationId').value = zone.location_id;
            document.getElementById('borough').value = zone.borough;
            document.getElementById('zoneName').value = zone.zone_name;
            document.getElementById('serviceZone').value = zone.service_zone || '';
            
            openModal('zoneModal');
        }
    } catch (error) {
        console.error('Error loading zone:', error);
        showError('Failed to load zone');
    }
}

async function saveZone(event) {
    event.preventDefault();
    
    const zoneData = {
        location_id: parseInt(document.getElementById('locationId').value),
        borough: document.getElementById('borough').value,
        zone_name: document.getElementById('zoneName').value,
        service_zone: document.getElementById('serviceZone').value
    };
    
    const zoneId = document.getElementById('zoneId').value;
    const url = zoneId ? `/api/zones/${zoneId}` : '/api/zones';
    const method = zoneId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(zoneData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('zoneModal');
            loadZones();
            showSuccess(zoneId ? 'Zone updated' : 'Zone created');
        } else {
            showError(data.error || 'Failed to save zone');
        }
    } catch (error) {
        console.error('Error saving zone:', error);
        showError('Failed to save zone');
    }
}

async function deleteZone(id) {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    
    try {
        const response = await fetch(`/api/zones/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadZones();
            showSuccess('Zone deleted');
        } else {
            showError(data.error || 'Failed to delete zone');
        }
    } catch (error) {
        console.error('Error deleting zone:', error);
        showError('Failed to delete zone');
    }
}

// User CRUD operations
async function showAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('password').required = true;
    openModal('userModal');
}

async function editUser(id) {
    try {
        const response = await fetch(`/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const user = data.data.find(u => u.user_id == id);
            if (user) {
                document.getElementById('userModalTitle').textContent = 'Edit User';
                document.getElementById('userId').value = user.user_id;
                document.getElementById('username').value = user.username;
                document.getElementById('email').value = user.email;
                document.getElementById('role').value = user.role;
                document.getElementById('password').required = false;
                
                openModal('userModal');
            }
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showError('Failed to load user');
    }
}

async function saveUser(event) {
    event.preventDefault();
    
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value
    };
    
    const password = document.getElementById('password').value;
    if (password) {
        userData.password = password;
    }
    
    const userId = document.getElementById('userId').value;
    const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
    const method = userId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('userModal');
            loadUsers();
            showSuccess(userId ? 'User updated' : 'User created');
        } else {
            showError(data.error || 'Failed to save user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showError('Failed to save user');
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadUsers();
            showSuccess('User deleted');
        } else {
            showError(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user');
    }
}

// Helper functions
async function loadZoneDropdowns() {
    try {
        const response = await fetch('/api/zones', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const options = data.data.map(zone => 
                `<option value="${zone.location_id}">${zone.zone_name} (${zone.borough})</option>`
            ).join('');
            
            document.getElementById('pickupLocationId').innerHTML = options;
            document.getElementById('dropoffLocationId').innerHTML = options;
        }
    } catch (error) {
        console.error('Error loading zones:', error);
    }
}

function showSection(section) {
    // Update menu
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    event.target.closest('li').classList.add('active');
    
    // Show section
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
}

function formatNumber(num) {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0';
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function setupPagination(containerId, pagination, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '<div class="pagination-controls">';
    html += `<button onclick="callback(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>Previous</button>`;
    html += `<span>Page ${pagination.page} of ${pagination.pages}</span>`;
    html += `<button onclick="callback(${pagination.page + 1})" ${pagination.page >= pagination.pages ? 'disabled' : ''}>Next</button>`;
    html += '</div>';
    
    container.innerHTML = html;
    
    // Replace the callback placeholder
    container.querySelectorAll('button').forEach(btn => {
        const match = btn.getAttribute('onclick')?.match(/callback\((\d+)\)/);
        if (match) {
            btn.onclick = () => callback(parseInt(match[1]));
        }
    });
}

function showSuccess(message) {
    // Simple alert for now - can be improved with toast notifications
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// Search and filter
function searchTrips() {
    const search = document.getElementById('tripSearch').value.toLowerCase();
    // Implement search logic
}

function filterTrips() {
    const filter = document.getElementById('tripFilter').value;
    loadTrips(1);
}

// Database operations
async function optimizeDatabase() {
    if (!confirm('This may take a few minutes. Continue?')) return;
    
    try {
        const response = await fetch('/api/admin/optimize', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Database optimized successfully');
            loadDatabaseStats();
        }
    } catch (error) {
        console.error('Error optimizing database:', error);
        showError('Failed to optimize database');
    }
}

async function viewCleaningLogs() {
    const container = document.getElementById('cleaningLogsContainer');
    
    if (container.style.display === 'none') {
        try {
            const response = await fetch('/api/admin/cleaning-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                const tbody = document.getElementById('cleaningLogsBody');
                tbody.innerHTML = data.data.map(log => `
                    <tr>
                        <td>${log.batch_date}</td>
                        <td>${log.records_processed}</td>
                        <td>${log.records_valid}</td>
                        <td>${log.records_excluded}</td>
                        <td><small>${JSON.stringify(log.exclusion_reason)}</small></td>
                    </tr>
                `).join('');
                
                container.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading cleaning logs:', error);
        }
    } else {
        container.style.display = 'none';
    }
}

// Setup charts
function setupCharts() {
    // Database size chart
    const ctx1 = document.getElementById('dbSizeChart')?.getContext('2d');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Data', 'Indexes', 'Free'],
                datasets: [{
                    data: [65, 25, 10],
                    backgroundColor: ['#4a90e2', '#f39c12', '#27ae60']
                }]
            }
        });
    }
    
    // Activity chart
    const ctx2 = document.getElementById('activityChart')?.getContext('2d');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Actions',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    borderColor: '#4a90e2'
                }]
            }
        });
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}