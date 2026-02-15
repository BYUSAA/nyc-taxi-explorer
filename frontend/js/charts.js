class ChartManager {
    static hourlyChart = null;
    static boroughChart = null;
    static trendsChart = null;

    static createHourlyChart(data) {
        const ctx = document.getElementById('hourlyChart')?.getContext('2d');
        if (!ctx) return;

        if (this.hourlyChart) {
            this.hourlyChart.destroy();
        }

        const hours = data.map(d => `${d.hour_of_day}:00`);
        const trips = data.map(d => d.trip_count);
        const fares = data.map(d => d.avg_fare);

        this.hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    {
                        label: 'Trip Count',
                        data: trips,
                        borderColor: '#4a90e2',
                        backgroundColor: 'rgba(74,144,226,0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Avg Fare ($)',
                        data: fares,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39,174,96,0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.dataset.label === 'Trip Count') {
                                    label += context.raw.toLocaleString();
                                } else {
                                    label += '$' + context.raw;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Number of Trips' },
                        ticks: { callback: value => value.toLocaleString() }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Average Fare ($)' },
                        grid: { drawOnChartArea: false },
                        ticks: { callback: value => '$' + value }
                    }
                }
            }
        });
    }

    static createBoroughChart(data) {
        const ctx = document.getElementById('boroughChart')?.getContext('2d');
        if (!ctx) return;

        if (this.boroughChart) {
            this.boroughChart.destroy();
        }

        const boroughs = data.map(d => d.borough);
        const tripCounts = data.map(d => d.trip_count);
        const colors = ['#4a90e2', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];

        this.boroughChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: boroughs,
                datasets: [{
                    data: tripCounts,
                    backgroundColor: colors,
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toLocaleString()} trips (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    static createTrendsChart(data) {
        const ctx = document.getElementById('trendsChart')?.getContext('2d');
        if (!ctx) return;

        if (this.trendsChart) {
            this.trendsChart.destroy();
        }

        const dates = data.map(d => new Date(d.trip_date).toLocaleDateString());
        const trips = data.map(d => d.trip_count);
        const revenue = data.map(d => d.daily_revenue);

        this.trendsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Daily Trips',
                        data: trips,
                        backgroundColor: '#4a90e2',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Daily Revenue ($)',
                        data: revenue,
                        backgroundColor: '#27ae60',
                        yAxisID: 'y1',
                        type: 'line'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Trip Count' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Revenue ($)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    static createDbSizeChart(data) {
        const ctx = document.getElementById('dbSizeChart')?.getContext('2d');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Data Size', 'Index Size'],
                datasets: [{
                    data: [
                        data.totals.data_size / (1024 * 1024),
                        data.totals.index_size / (1024 * 1024)
                    ],
                    backgroundColor: ['#4a90e2', '#f39c12'],
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw.toFixed(2);
                                return `${label}: ${value} MB`;
                            }
                        }
                    }
                }
            }
        });
    }

    static createActivityChart(data) {
        const ctx = document.getElementById('activityChart')?.getContext('2d');
        if (!ctx) return;

        // Group by date
        const activityByDate = {};
        data.forEach(log => {
            const date = new Date(log.created_at).toLocaleDateString();
            activityByDate[date] = (activityByDate[date] || 0) + 1;
        });

        const dates = Object.keys(activityByDate).slice(-7);
        const counts = dates.map(d => activityByDate[d]);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Admin Actions',
                    data: counts,
                    borderColor: '#4a90e2',
                    backgroundColor: 'rgba(74,144,226,0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}