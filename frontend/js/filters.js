class FilterManager {
    constructor() {
        this.filters = {
            borough: '',
            startDate: '',
            endDate: '',
            minFare: '',
            maxFare: '',
            sortBy: 'pickup_datetime',
            sortOrder: 'DESC'
        };
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Borough filter
        const boroughFilter = document.getElementById('boroughFilter');
        if (boroughFilter) {
            boroughFilter.addEventListener('change', () => {
                this.filters.borough = boroughFilter.value;
                this.applyFilters();
            });
        }

        // Date filters
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filters.startDate = dateFilter.value;
                this.filters.endDate = dateFilter.value;
                this.applyFilters();
            });
        }

        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate && endDate) {
            startDate.addEventListener('change', () => {
                this.filters.startDate = startDate.value;
                this.applyFilters();
            });
            endDate.addEventListener('change', () => {
                this.filters.endDate = endDate.value;
                this.applyFilters();
            });
        }

        // Fare filters
        const minFare = document.getElementById('minFare');
        const maxFare = document.getElementById('maxFare');
        if (minFare) {
            minFare.addEventListener('change', () => {
                this.filters.minFare = minFare.value;
                this.applyFilters();
            });
        }
        if (maxFare) {
            maxFare.addEventListener('change', () => {
                this.filters.maxFare = maxFare.value;
                this.applyFilters();
            });
        }

        // Sort filters
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.filters.sortBy = sortBy.value;
                this.applyFilters();
            });
        }

        const sortOrder = document.getElementById('sortOrder');
        if (sortOrder) {
            sortOrder.addEventListener('change', () => {
                this.filters.sortOrder = sortOrder.value;
                this.applyFilters();
            });
        }
    }

    async applyFilters() {
        try {
            const data = await API.getTrips({
                page: 1,
                limit: 50,
                ...this.filters
            });

            if (data.success) {
                this.updateTable(data.data);
                this.updatePagination(data.pagination);
            }
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }

    resetFilters() {
        this.filters = {
            borough: '',
            startDate: '',
            endDate: '',
            minFare: '',
            maxFare: '',
            sortBy: 'pickup_datetime',
            sortOrder: 'DESC'
        };

        // Reset form inputs
        const inputs = ['boroughFilter', 'dateFilter', 'startDate', 'endDate', 'minFare', 'maxFare', 'sortBy', 'sortOrder'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });

        const sortBy = document.getElementById('sortBy');
        if (sortBy) sortBy.value = 'pickup_datetime';

        this.applyFilters();
    }

    updateTable(trips) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        if (!trips || trips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-message">No trips found</td></tr>';
            return;
        }

        tbody.innerHTML = trips.map(trip => {
            const pickupTime = new Date(trip.pickup_datetime).toLocaleString();
            return `
                <tr>
                    <td>${pickupTime}</td>
                    <td>${trip.pickup_zone || 'Unknown'}</td>
                    <td>${trip.dropoff_zone || 'Unknown'}</td>
                    <td>${trip.trip_distance} mi</td>
                    <td>$${trip.total_amount}</td>
                    <td>$${trip.tip_amount}</td>
                    <td>${trip.passenger_count}</td>
                </tr>
            `;
        }).join('');
    }

    updatePagination(pagination) {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = pagination.page <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = pagination.page >= pagination.pages;
        }
    }

    async changePage(delta) {
        const pageInfo = document.getElementById('pageInfo');
        if (!pageInfo) return;

        const match = pageInfo.textContent.match(/Page (\d+) of (\d+)/);
        if (!match) return;

        const currentPage = parseInt(match[1]);
        const totalPages = parseInt(match[2]);
        const newPage = currentPage + delta;

        if (newPage >= 1 && newPage <= totalPages) {
            try {
                const data = await API.getTrips({
                    page: newPage,
                    limit: 50,
                    ...this.filters
                });

                if (data.success) {
                    this.updateTable(data.data);
                    this.updatePagination(data.pagination);
                }
            } catch (error) {
                console.error('Error changing page:', error);
            }
        }
    }
}

// Initialize filter manager
const filterManager = new FilterManager();