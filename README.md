# 🚕 NYC Taxi Data Explorer

## Urban Mobility Analysis System

A comprehensive full-stack application for analyzing NYC Taxi trip data with ~6.5M records. Features data cleaning, normalization, custom algorithms, interactive visualizations, and complete CRUD operations with admin panel.

**Technologies:** HTML, CSS, Vanilla JavaScript, Node.js, MySQL  
**Architecture:** Three-tier (Frontend, Backend, Database)  
**Admin Access:** Complete CRUD operations for trips, zones, users

---

## ✨ Features

### 📊 Data Processing Pipeline
- Automated cleaning with transparency logging
- Missing value handling with imputation
- Duplicate detection using HashMap (O(n))
- Outlier removal (distance, fare, speed constraints)
- Feature engineering (8+ derived features)

### 🗄️ Normalized Database
- 3NF schema with optimized indexing
- 6 tables with proper relationships
- 13+ indexes for query performance
- Views for common queries
- Foreign key constraints

### ⚙️ Custom Algorithms (Manual Implementation)
- **Merge Sort** - O(n log n) for sorting trips
- **Min Heap** - O(n log k) for Top-K problems
- **HashMap** - O(1) for frequency counting
- **Quick Sort** - O(n log n) average case
- **Binary Search** - O(log n) for fast lookups
- **Statistical functions** - mean, median, mode, std dev

### 🔧 Admin Panel
- Complete CRUD operations for trips
- Zone management with 265 NYC zones
- User management with roles (admin/viewer)
- Audit logs for all actions
- Database statistics and optimization
- System health monitoring

### 📈 Interactive Dashboard
- Real-time filtering by borough, date, fare
- 4 KPI cards with live stats
- 6+ Chart.js visualizations
- Paginated data table
- 3 key insights with interpretation
- Responsive design

---

## 🏗️ System Architecture
