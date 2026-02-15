// Main application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚕 NYC Taxi Data Explorer loaded');
    
    showLoading();
    
    try {
        // Check API health
        await checkHealth();
        
        // Load all dashboard data
        await Promise.all([
            loadStats(),
            loadHourlyPatterns(),
            loadBoroughStats(),
            loadInsights(),
            loadTrips()
        ]);
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showError('Failed to load data. Please refresh the page.');
    }
});

// Check API health
async function checkHealth() {
    try {
        const data = await API.checkHealth();
        console.log('API Health:', data);
    } catch (error) {
        console.warn('API health check failed:', error);
    }
}

// Load KPI stats
async function loadStats() {
    try {
        const data = await API.getStats();
        
        if (data.success) {
            const stats = data.data;
            
            const kpiContainer = document.getElementById('kpiContainer');
            if (kpiContainer) {
                kpiContainer.innerHTML = `
                    <div class="kpi-card">
                        <div class="kpi-label">Total Trips</div>
                        <div class="kpi-value">${formatNumber(stats.total_trips)}</div>
                        <div class="kpi-trend">January 2019</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total Revenue</div>
                        <div class="kpi-value">$${formatNumber(stats.total_revenue)}</div>
                        <div class="kpi-trend">Avg $${stats.avg_fare}/trip</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Average Fare</div>
                        <div class="kpi-value">$${stats.avg_fare}</div>
                        <div class="kpi-trend">Per trip</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Average Distance</div>
                        <div class="kpi-value">${stats.avg_distance} mi</div>
                        <div class="kpi-trend">Per trip</div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load hourly patterns
async function loadHourlyPatterns() {
    try {
        const data = await API.getHourlyPatterns();
        
        if (data.success) {
            ChartManager.createHourlyChart(data.data);
        }
    } catch (error) {
        console.error('Error loading hourly patterns:', error);
    }
}

// Load borough stats
async function loadBoroughStats() {
    try {
        const data = await API.getBoroughStats();
        
        if (data.success) {
            ChartManager.createBoroughChart(data.data);
        }
    } catch (error) {
        console.error('Error loading borough stats:', error);
    }
}

// Load insights
async function loadInsights() {
    try {
        const data = await API.getInsights();
        
        if (data.success && data.insights) {
            displayInsights(data.insights);
        }
    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

// Load trips
async function loadTrips() {
    try {
        const data = await API.getTrips({ page: 1, limit: 50 });
        
        if (data.success) {
            filterManager.updateTable(data.data);
            filterManager.updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

// Display insights
function displayInsights(insights) {
    const container = document.getElementById('insightsContainer');
    if (!container) return;

    if (!insights || insights.length === 0) {
        container.innerHTML = '<p>No insights available</p>';
        return;
    }

    container.innerHTML = insights.map(insight => `
        <div class="insight-card">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-desc">${insight.description}</div>
            <div class="insight-data">
                ${formatInsightData(insight.data)}
            </div>
            <div class="insight-interp">${insight.interpretation}</div>
        </div>
    `).join('');
}

// Format insight data
function formatInsightData(data) {
    if (!data) return '';
    
    return Object.entries(data)
        .map(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<div><strong>${label}:</strong> ${value}</div>`;
        })
        .join('');
}

// Format numbers
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Show loading state
function showLoading() {
    const kpiContainer = document.getElementById('kpiContainer');
    if (kpiContainer) {
        kpiContainer.innerHTML = Array(4).fill(`
            <div class="kpi-card loading">
                <div class="kpi-label">Loading...</div>
            </div>
        `).join('');
    }
}

// Show error message
function showError(message) {
    const container = document.querySelector('.container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', `
            <div style="background: #fee; color: #c00; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                ⚠️ ${message}
            </div>
        `);
    }
}

// Demo functions
async function demoMergeSort() {
    const resultDiv = document.getElementById('mergeSortResult');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = 'Sorting...';
    
    try {
        const data = await API.getSortedTrips('total_amount', 100);
        
        if (data.success) {
            const topTrips = data.data.slice(-5).reverse();
            resultDiv.innerHTML = `
                <div><strong>Top 5 Fares (Merge Sort):</strong></div>
                ${topTrips.map(t => `$${t.total_amount} - ${t.pickup_zone || 'Unknown'}`).join('<br>')}
                <div style="margin-top:8px; font-size:0.8rem; color:#666;">
                    Time: ${data.timeMs}ms • ${data.complexity}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Error running merge sort';
    }
}

async function demoMinHeap() {
    const resultDiv = document.getElementById('minHeapResult');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = 'Finding top fares...';
    
    try {
        const data = await API.getTopFares(5);
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div><strong>Top 5 Fares (Min Heap):</strong></div>
                ${data.data.map(t => `$${t.total_amount} - ${t.pickup_zone || 'Unknown'}`).join('<br>')}
                <div style="margin-top:8px; font-size:0.8rem; color:#666;">
                    Algorithm: ${data.algorithm} • ${data.complexity}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Error running min heap';
    }
}

async function demoHashMap() {
    const resultDiv = document.getElementById('hashMapResult');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = 'Finding popular routes...';
    
    try {
        const data = await API.getPopularRoutes(5);
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div><strong>Top 5 Routes (HashMap):</strong></div>
                ${data.data.map(r => 
                    `${r.pickup_borough || '?'} → ${r.dropoff_borough || '?'}: ${r.trip_count} trips`
                ).join('<br>')}
                <div style="margin-top:8px; font-size:0.8rem; color:#666;">
                    Algorithm: ${data.algorithm}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Error running hash map';
    }
}