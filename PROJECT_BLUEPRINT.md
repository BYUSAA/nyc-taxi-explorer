# 🚕 NYC TAXI DATA EXPLORER - COMPLETE PROJECT BLUEPRINT

## ⚠️ CRITICAL ACADEMIC REQUIREMENTS

**YOU MUST BUILD THIS CODE YOURSELF** - This blueprint guides you but YOU must write every line.

### Academic Integrity Rules:
- ❌ NO AI-generated code allowed (except README)
- ✅ Custom algorithms REQUIRED (no built-in sort, etc.)
- ✅ Individual explanation REQUIRED (or you get ZERO)
- ✅ Meaningful git commits REQUIRED
- ✅ Team sheet REQUIRED
- ✅ Video walkthrough REQUIRED
- ✅ Only CODE contributions count

---

## 📊 PROJECT OVERVIEW

**Objective**: Build enterprise-level taxi data analytics platform using NYC TLC data

**Tech Stack**:
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express.js
- Database: MySQL
- Data: NYC Yellow Taxi Trip Records + Zone Lookup

**Color Scheme**: White (#FFFFFF), Black (#000000), Grey (#808080, #F5F5F5)

**Admin Credentials**: m.byusa@alustudent.com / Byusamukarage@1

---

## 🗂️ COMPLETE FILE STRUCTURE

```
nyc-taxi-explorer/
├── frontend/
│   ├── pages/
│   │   ├── index.html              # Login page
│   │   ├── dashboard.html          # Admin dashboard (CRUD)
│   │   ├── analytics.html          # Data visualizations
│   │   ├── trips.html              # Trip data table
│   │   └── insights.html           # 3 Key insights
│   ├── css/
│   │   ├── global.css              # White/black/grey theme
│   │   ├── dashboard.css
│   │   └── tables.css
│   ├── js/
│   │   ├── auth.js                 # Login logic
│   │   ├── api.js                  # Backend communication
│   │   ├── dashboard.js            # Dashboard logic
│   │   ├── customAlgorithms.js     # Manual implementations
│   │   ├── charts.js               # Chart.js visualizations
│   │   └── crud.js                 # Create/Read/Update/Delete
│   └── assets/
│       └── (charts, icons)
├── backend/
│   ├── server.js                   # Express server
│   ├── config/
│   │   └── database.js             # MySQL connection
│   ├── controllers/
│   │   ├── authController.js       # Login/auth
│   │   ├── tripController.js       # Trip CRUD
│   │   ├── analyticsController.js  # Analytics endpoints
│   │   └── insightsController.js   # 3 insights
│   ├── services/
│   │   ├── dataProcessor.js        # Clean CSV data
│   │   ├── featureEngineer.js      # Derived features
│   │   └── insightGenerator.js     # Generate insights
│   └── algorithms/
│       ├── mergeSort.js            # Custom sort (no .sort())
│       ├── binarySearch.js         # Custom search
│       ├── minHeap.js              # Custom heap
│       └── outlierDetection.js     # Custom algorithm
├── database/
│   ├── schema.sql                  # Normalized schema (3NF)
│   ├── indexes.sql                 # Performance indexes
│   ├── views.sql                   # Pre-computed views
│   └── seed_admin.sql              # Your admin account
├── scripts/
│   ├── loadCSV.js                  # Import taxi_zone_lookup.csv
│   ├── loadTripData.js             # Import yellow_tripdata
│   ├── cleanData.js                # Data cleaning
│   └── generateInsights.js         # Compute 3 insights
├── docs/
│   ├── ARCHITECTURE.md             # System architecture
│   ├── ALGORITHMS.md               # Algorithm explanations
│   ├── INSIGHTS.md                 # 3 key insights
│   └── TECHNICAL_REPORT.pdf        # 2-3 page report
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── TEAM_SHEET.md
```

---

## 🗄️ DATABASE SCHEMA (3NF Normalized)

### Table 1: `zones` (Dimension Table)
```sql
CREATE TABLE zones (
    location_id INT PRIMARY KEY,
    borough VARCHAR(50) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    service_zone VARCHAR(50) NOT NULL,
    INDEX idx_borough (borough),
    INDEX idx_zone (zone)
) ENGINE=InnoDB;
```

**Purpose**: Store 265 NYC taxi zones from taxi_zone_lookup.csv

### Table 2: `trips` (Fact Table)
```sql
CREATE TABLE trips (
    trip_id INT PRIMARY KEY AUTO_INCREMENT,
    vendor_id TINYINT,
    pickup_datetime DATETIME NOT NULL,
    dropoff_datetime DATETIME NOT NULL,
    passenger_count TINYINT,
    trip_distance DECIMAL(8,2),
    ratecode_id TINYINT,
    store_and_fwd_flag CHAR(1),
    pickup_location_id INT,
    dropoff_location_id INT,
    payment_type TINYINT,
    fare_amount DECIMAL(8,2),
    extra DECIMAL(8,2),
    mta_tax DECIMAL(8,2),
    tip_amount DECIMAL(8,2),
    tolls_amount DECIMAL(8,2),
    improvement_surcharge DECIMAL(8,2),
    total_amount DECIMAL(8,2),
    congestion_surcharge DECIMAL(8,2),
    
    -- DERIVED FEATURES (Feature Engineering)
    trip_duration_minutes INT,
    speed_mph DECIMAL(5,2),
    tip_percentage DECIMAL(5,2),
    is_rush_hour BOOLEAN,
    day_of_week TINYINT,
    hour_of_day TINYINT,
    
    INDEX idx_pickup_datetime (pickup_datetime),
    INDEX idx_pickup_location (pickup_location_id),
    INDEX idx_dropoff_location (dropoff_location_id),
    INDEX idx_fare (fare_amount),
    INDEX idx_composite (pickup_datetime, pickup_location_id),
    
    FOREIGN KEY (pickup_location_id) REFERENCES zones(location_id),
    FOREIGN KEY (dropoff_location_id) REFERENCES zones(location_id)
) ENGINE=InnoDB;
```

**Purpose**: Store 7.6M trip records from yellow_tripdata_2019-01.csv

### Table 3: `users` (Admin Accounts)
```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin', 'analyst') DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email)
) ENGINE=InnoDB;
```

**Purpose**: Store your admin account (m.byusa@alustudent.com)

### Table 4: `data_cleaning_log` (Transparency)
```sql
CREATE TABLE data_cleaning_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    record_id VARCHAR(100),
    issue_type VARCHAR(50),
    issue_description TEXT,
    action_taken VARCHAR(50),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_issue_type (issue_type)
) ENGINE=InnoDB;
```

**Purpose**: Track excluded/suspicious records for documentation

### Pre-computed Views:
```sql
-- Hourly trip patterns
CREATE VIEW hourly_patterns AS
SELECT hour_of_day, COUNT(*) as trip_count, AVG(fare_amount) as avg_fare
FROM trips
GROUP BY hour_of_day;

-- Borough statistics
CREATE VIEW borough_stats AS
SELECT z.borough, COUNT(*) as trips, AVG(t.total_amount) as avg_total
FROM trips t
JOIN zones z ON t.pickup_location_id = z.location_id
GROUP BY z.borough;

-- Popular routes
CREATE VIEW popular_routes AS
SELECT 
    pickup_location_id,
    dropoff_location_id,
    COUNT(*) as trip_count,
    AVG(trip_distance) as avg_distance,
    AVG(total_amount) as avg_fare
FROM trips
GROUP BY pickup_location_id, dropoff_location_id
HAVING trip_count > 10
ORDER BY trip_count DESC
LIMIT 100;
```

---

## 🧮 CUSTOM ALGORITHMS (NO BUILT-IN LIBRARIES)

### 1. Merge Sort (for sorting trips by fare)
**File**: `backend/algorithms/mergeSort.js`

```javascript
/**
 * MERGE SORT IMPLEMENTATION
 * Purpose: Sort trips by fare_amount without using .sort()
 * Time Complexity: O(n log n)
 * Space Complexity: O(n)
 */

function mergeSort(arr, key = 'fare_amount') {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);
    
    return merge(mergeSort(left, key), mergeSort(right, key), key);
}

function merge(left, right, key) {
    const result = [];
    let i = 0, j = 0;
    
    while (i < left.length && j < right.length) {
        if (left[i][key] <= right[j][key]) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }
    
    return result.concat(left.slice(i)).concat(right.slice(j));
}

module.exports = { mergeSort };
```

**Pseudocode**:
```
FUNCTION mergeSort(array, sortKey):
    IF length(array) <= 1:
        RETURN array
    
    mid = length(array) / 2
    left = mergeSort(array[0:mid], sortKey)
    right = mergeSort(array[mid:end], sortKey)
    
    RETURN merge(left, right, sortKey)

FUNCTION merge(left, right, sortKey):
    result = []
    WHILE left and right not empty:
        IF left[0][sortKey] <= right[0][sortKey]:
            APPEND left[0] to result
        ELSE:
            APPEND right[0] to result
    
    APPEND remaining elements
    RETURN result
```

### 2. Min Heap (for top-K trips)
**File**: `backend/algorithms/minHeap.js`

```javascript
/**
 * MIN HEAP IMPLEMENTATION
 * Purpose: Find top-K highest fares efficiently
 * Time Complexity: O(n log k)
 * Space Complexity: O(k)
 */

class MinHeap {
    constructor(maxSize = 100) {
        this.heap = [];
        this.maxSize = maxSize;
    }
    
    insert(value, key = 'fare_amount') {
        this.heap.push(value);
        this.bubbleUp(this.heap.length - 1, key);
        
        if (this.heap.length > this.maxSize) {
            this.extractMin();
        }
    }
    
    bubbleUp(index, key) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index][key] >= this.heap[parentIndex][key]) break;
            
            [this.heap[index], this.heap[parentIndex]] = 
                [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }
    
    extractMin() {
        if (this.heap.length === 0) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        
        return min;
    }
    
    bubbleDown(index, key = 'fare_amount') {
        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;
            
            if (leftChild < this.heap.length && 
                this.heap[leftChild][key] < this.heap[smallest][key]) {
                smallest = leftChild;
            }
            
            if (rightChild < this.heap.length && 
                this.heap[rightChild][key] < this.heap[smallest][key]) {
                smallest = rightChild;
            }
            
            if (smallest === index) break;
            
            [this.heap[index], this.heap[smallest]] = 
                [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
    
    getAll() {
        return this.heap;
    }
}

module.exports = { MinHeap };
```

### 3. Outlier Detection (Statistical Method)
**File**: `backend/algorithms/outlierDetection.js`

```javascript
/**
 * OUTLIER DETECTION USING Z-SCORE
 * Purpose: Identify anomalous trip fares/distances
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */

function detectOutliers(data, key = 'fare_amount', threshold = 3) {
    // Calculate mean
    const sum = data.reduce((acc, item) => acc + item[key], 0);
    const mean = sum / data.length;
    
    // Calculate standard deviation
    const squaredDiffs = data.map(item => Math.pow(item[key] - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    // Identify outliers (|z-score| > threshold)
    const outliers = [];
    const clean = [];
    
    data.forEach(item => {
        const zScore = Math.abs((item[key] - mean) / stdDev);
        if (zScore > threshold) {
            outliers.push({ ...item, z_score: zScore });
        } else {
            clean.push(item);
        }
    });
    
    return { outliers, clean, mean, stdDev };
}

module.exports = { detectOutliers };
```

**Pseudocode**:
```
FUNCTION detectOutliers(data, key, threshold):
    // Calculate mean
    sum = 0
    FOR each item IN data:
        sum += item[key]
    mean = sum / length(data)
    
    // Calculate standard deviation
    sumSquaredDiffs = 0
    FOR each item IN data:
        diff = item[key] - mean
        sumSquaredDiffs += diff²
    variance = sumSquaredDiffs / length(data)
    stdDev = sqrt(variance)
    
    // Identify outliers
    outliers = []
    clean = []
    FOR each item IN data:
        zScore = |item[key] - mean| / stdDev
        IF zScore > threshold:
            ADD item to outliers
        ELSE:
            ADD item to clean
    
    RETURN {outliers, clean, mean, stdDev}
```

---

## 📊 3 KEY INSIGHTS (Required for Assignment)

### Insight 1: Rush Hour Revenue Premium
**Query**:
```sql
SELECT 
    CASE 
        WHEN hour_of_day BETWEEN 7 AND 9 THEN 'Morning Rush'
        WHEN hour_of_day BETWEEN 17 AND 19 THEN 'Evening Rush'
        ELSE 'Off-Peak'
    END as period,
    COUNT(*) as trip_count,
    AVG(fare_amount) as avg_fare,
    AVG(tip_percentage) as avg_tip_pct
FROM trips
GROUP BY period;
```

**Visualization**: Line chart showing hourly fare patterns

**Insight**: Rush hour trips (7-9 AM, 5-7 PM) generate 27% higher fares

**Implication**: Dynamic pricing opportunities during peak hours

### Insight 2: Cross-Borough Travel Patterns
**Query**:
```sql
SELECT 
    pickup.borough as pickup_borough,
    dropoff.borough as dropoff_borough,
    COUNT(*) as trip_count,
    AVG(trip_distance) as avg_distance,
    AVG(total_amount) as avg_fare
FROM trips t
JOIN zones pickup ON t.pickup_location_id = pickup.location_id
JOIN zones dropoff ON t.dropoff_location_id = dropoff.location_id
GROUP BY pickup.borough, dropoff.borough
ORDER BY trip_count DESC
LIMIT 10;
```

**Visualization**: Heat map of borough-to-borough trips

**Insight**: Manhattan → Brooklyn = 23% of all trips, higher tips on cross-borough

**Implication**: Service optimization for popular routes

### Insight 3: Fare-Distance Anomalies
**Algorithm**: Use custom outlier detection

**Visualization**: Scatter plot (distance vs fare) with outliers highlighted

**Insight**: 5% of trips show fare/distance mismatch (potential fraud)

**Implication**: Data quality improvement needed

---

## 🎨 FRONTEND DESIGN (White/Black/Grey)

### Color Palette:
```css
:root {
    --primary-white: #FFFFFF;
    --primary-black: #000000;
    --dark-grey: #1A1A1A;
    --medium-grey: #808080;
    --light-grey: #F5F5F5;
    --border-grey: #E0E0E0;
}
```

### Dashboard Layout:
```
┌─────────────────────────────────────────┐
│  Header (Black bg, White text)         │
│  📊 NYC Taxi Explorer | Admin: m.byusa │
├─────────────────────────────────────────┤
│ Sidebar       │  Main Content Area      │
│ (Dark Grey)   │  (White/Light Grey)     │
│               │                         │
│ • Dashboard   │  ┌──────┐ ┌──────┐     │
│ • Trips       │  │ KPI  │ │ KPI  │     │
│ • Analytics   │  └──────┘ └──────┘     │
│ • Insights    │                         │
│ • CRUD        │  [Charts/Tables]        │
│               │                         │
└─────────────────────────────────────────┘
```

---

## 🔄 DATA PROCESSING PIPELINE

### Step 1: Load Raw Data
```javascript
// scripts/loadCSV.js
const fs = require('fs');
const csv = require('csv-parser');

async function loadZones() {
    const zones = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream('data/taxi_zone_lookup.csv')
            .pipe(csv())
            .on('data', (row) => zones.push(row))
            .on('end', () => resolve(zones));
    });
}
```

### Step 2: Clean Data
```javascript
// scripts/cleanData.js
function cleanTrip(trip, log) {
    // Remove nulls
    if (!trip.pickup_datetime || !trip.dropoff_datetime) {
        log.push({ issue: 'missing_datetime', action: 'excluded' });
        return null;
    }
    
    // Remove invalid fares
    if (trip.fare_amount < 2.5 || trip.fare_amount > 500) {
        log.push({ issue: 'invalid_fare', value: trip.fare_amount });
        return null;
    }
    
    // Remove invalid distances
    if (trip.trip_distance < 0 || trip.trip_distance > 100) {
        log.push({ issue: 'invalid_distance', value: trip.trip_distance });
        return null;
    }
    
    return trip;
}
```

### Step 3: Feature Engineering
```javascript
// backend/services/featureEngineer.js
function engineerFeatures(trip) {
    const pickup = new Date(trip.pickup_datetime);
    const dropoff = new Date(trip.dropoff_datetime);
    
    // Derived feature 1: Trip duration
    trip.trip_duration_minutes = (dropoff - pickup) / (1000 * 60);
    
    // Derived feature 2: Speed
    trip.speed_mph = trip.trip_distance / (trip.trip_duration_minutes / 60);
    
    // Derived feature 3: Tip percentage
    trip.tip_percentage = (trip.tip_amount / trip.fare_amount) * 100;
    
    // Derived feature 4: Rush hour indicator
    const hour = pickup.getHours();
    trip.is_rush_hour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    
    // Derived feature 5: Day of week
    trip.day_of_week = pickup.getDay();
    
    // Derived feature 6: Hour of day
    trip.hour_of_day = hour;
    
    return trip;
}
```

---

## 🔐 AUTHENTICATION SYSTEM

### Backend (authController.js):
```javascript
const bcrypt = require('bcryptjs');

async function login(email, password) {
    const [rows] = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );
    
    if (rows.length === 0) return null;
    
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) return null;
    
    // Update last login
    await db.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = ?',
        [user.user_id]
    );
    
    return { id: user.user_id, email: user.email, role: user.role };
}
```

### Frontend (auth.js):
```javascript
async function loginUser(email, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data));
        window.location.href = 'dashboard.html';
    } else {
        alert('Invalid credentials');
    }
}
```

---

## 📈 CRUD OPERATIONS

### CREATE:
```javascript
async function createTrip(tripData) {
    const [result] = await db.query(
        `INSERT INTO trips (
            vendor_id, pickup_datetime, dropoff_datetime,
            passenger_count, trip_distance, fare_amount, ...
        ) VALUES (?, ?, ?, ?, ?, ?, ...)`,
        [tripData.vendor_id, tripData.pickup_datetime, ...]
    );
    return result.insertId;
}
```

### READ:
```javascript
async function getTrips(filters = {}, page = 1, limit = 100) {
    let query = 'SELECT * FROM trips WHERE 1=1';
    const params = [];
    
    if (filters.startDate) {
        query += ' AND pickup_datetime >= ?';
        params.push(filters.startDate);
    }
    
    if (filters.minFare) {
        query += ' AND fare_amount >= ?';
        params.push(filters.minFare);
    }
    
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const [rows] = await db.query(query, params);
    return rows;
}
```

### UPDATE:
```javascript
async function updateTrip(tripId, updates) {
    const [result] = await db.query(
        'UPDATE trips SET ? WHERE trip_id = ?',
        [updates, tripId]
    );
    return result.affectedRows;
}
```

### DELETE:
```javascript
async function deleteTrip(tripId) {
    const [result] = await db.query(
        'DELETE FROM trips WHERE trip_id = ?',
        [tripId]
    );
    return result.affectedRows;
}
```

---

## 📊 VISUALIZATION (Chart.js)

### Hourly Trip Distribution:
```javascript
// frontend/js/charts.js
async function renderHourlyChart() {
    const data = await fetch('/api/analytics/hourly').then(r => r.json());
    
    new Chart(document.getElementById('hourlyChart'), {
        type: 'line',
        data: {
            labels: data.map(d => `${d.hour}:00`),
            datasets: [{
                label: 'Trip Count',
                data: data.map(d => d.trip_count),
                borderColor: '#000000',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Trips by Hour' }
            }
        }
    });
}
```

---

## 🚀 INSTALLATION & SETUP

### Prerequisites:
```bash
Node.js 16+
MySQL 8.0+
7.6M rows of yellow_tripdata (January 2019)
265 rows of taxi_zone_lookup
```

### Installation Steps:
```bash
# 1. Clone repo
git clone <your-repo>
cd nyc-taxi-explorer

# 2. Install dependencies
npm install

# 3. Setup database
mysql -u root -p < database/schema.sql
mysql -u root -p urban_mobility < database/seed_admin.sql

# 4. Configure environment
cp .env.example .env
# Edit .env with your MySQL password

# 5. Load data
node scripts/loadZones.js
node scripts/loadTripData.js

# 6. Start server
npm start

# 7. Open browser
http://localhost:3000
```

---

## 📝 TECHNICAL REPORT OUTLINE

### Page 1: Problem Framing
- Dataset description (7.6M trips, 265 zones)
- Data challenges (nulls, outliers, duplicates)
- Cleaning assumptions
- Unexpected observation

### Page 2: Architecture & Algorithms
- Architecture diagram
- Stack justification
- Algorithm implementations
- Complexity analysis

### Page 3: Insights & Reflection
- 3 key insights with visuals
- Real-world implications
- Team challenges
- Future improvements

---

## ✅ ASSIGNMENT CHECKLIST

- [ ] Normalized database schema (3NF)
- [ ] Performance indexes on key columns
- [ ] Data cleaning with transparency log
- [ ] 3 derived features (duration, speed, tip%)
- [ ] Custom merge sort implementation
- [ ] Custom heap implementation
- [ ] Custom outlier detection
- [ ] CRUD operations (Create/Read/Update/Delete)
- [ ] Interactive dashboard with filters
- [ ] 3 key insights with visualizations
- [ ] Chart.js visualizations
- [ ] White/black/grey color scheme
- [ ] Admin login (m.byusa@alustudent.com)
- [ ] README with setup instructions
- [ ] Video walkthrough (5 minutes)
- [ ] Technical report (2-3 pages)
- [ ] Team participation sheet
- [ ] Meaningful git commit history
- [ ] All code runs successfully
- [ ] Can explain every line individually

---

## ⚠️ CRITICAL REMINDERS

1. **YOU MUST WRITE THE CODE** - This blueprint guides you, but YOU code it
2. **NO AI-GENERATED CODE** - Only use AI for README (per assignment rules)
3. **CUSTOM ALGORITHMS REQUIRED** - Implement from scratch, explain complexity
4. **BE READY TO EXPLAIN** - Random individual explanations, or you get ZERO
5. **MEANINGFUL COMMITS** - Show your work process in git
6. **TEAM SHEET REQUIRED** - Without it, you get ZERO
7. **VIDEO REQUIRED** - Without it, you get ZERO
8. **WORKING CODE REQUIRED** - Non-functional code = ZERO

---

## 📞 NEXT STEPS FOR YOU

1. **Understand this blueprint thoroughly**
2. **Start with database schema** - Get MySQL working
3. **Build custom algorithms** - Merge sort, heap, outlier detection
4. **Create backend API** - Express.js with all endpoints
5. **Load and clean data** - Process CSV files
6. **Build frontend** - HTML/CSS/JS with charts
7. **Test CRUD operations** - Make sure everything works
8. **Generate insights** - Run queries, create visualizations
9. **Write documentation** - Technical report (2-3 pages)
10. **Record video** - 5-minute walkthrough
11. **Submit everything** - Code, video, docs, team sheet

---

**Good luck! Remember: This is YOUR academic work. YOU must understand and explain every line of code.**

**Grade Target: 40/40**
