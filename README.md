#  NYC TAXI DATA EXPLORER - ENTERPRISE EDITION

## Complete Urban Mobility Analysis System with Full Admin Control

A comprehensive, production-ready full-stack application for analyzing NYC Taxi trip data with ~6.5M records. Features complete data processing pipeline, normalized database, custom algorithms, interactive dashboards, and full administrative control.

**Author:** System Admin  
**Technologies:** Node.js, Express, MySQL, HTML5, CSS3, JavaScript, Chart.js  
**Architecture:** Three-tier Enterprise Architecture  
**Grade Target:** 40/40

---

##  FEATURES

###  Complete Admin Control
- ✅ User management (CRUD with roles)
- ✅ Audit logs for all actions
- ✅ Database statistics and optimization
- ✅ System health monitoring
- ✅ Maintenance mode toggle
- ✅ Backup and restore functionality
- ✅ Data cleaning logs
- ✅ API key management

###  Data Processing Pipeline
- ✅ Automated cleaning with transparency logging
- ✅ Missing value handling with imputation
- ✅ Duplicate detection using HashMap (O(n))
- ✅ Outlier removal (distance, fare, speed constraints)
- ✅ Feature engineering (8+ derived features)
- ✅ Batch processing for 6.5M+ records

###  Normalized Database
- ✅ 3NF schema with 8+ tables
- ✅ 20+ indexes for query optimization
- ✅ Foreign key constraints
- ✅ Views for common queries
- ✅ Stored procedures for aggregates
- ✅ Triggers for data integrity

###  Custom Algorithms (Manual Implementation)
- ✅ **Merge Sort** - O(n log n) for sorting trips
- ✅ **Min Heap** - O(log n) for priority queue
- ✅ **HashMap** - O(1) for frequency counting
- ✅ **Quick Select** - O(n) for finding kth element
- ✅ **K-Means Clustering** - For pattern detection
- ✅ **Statistical functions** (mean, median, mode, std dev)

###  Interactive Dashboards
- ✅ **Public Dashboard** - Real-time analytics
- ✅ **Admin Panel** - Complete system control
- ✅ **Driver Portal** - Live ride requests
- ✅ **Client Portal** - Ride booking interface

###  Security Features
- ✅ JWT authentication
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Audit logging



##  SYSTEM ARCHITECTURE
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Public    │  │   Admin     │  │   Driver    │  │   Client    │         │
│  │  Dashboard  │  │    Panel    │  │   Portal    │  │   Portal    │         │
│  │  index.html │  │  admin.html │  │ driver.html │  │ client.html │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │               │               │               │                   │
│         └───────────────┴───────────────┴───────────────┘                   │
│                              │                                              │
│                         ┌────▼────┐                                         │
│                         │  HTML5  │                                         │
│                         │  CSS3   │                                         │
│                         │   JS    │                                         │
│                         │ Chart.js│                                         │
│                         └────┬────┘                                         │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ HTTPS/JSON (REST API)
┌──────────────────────────────▼─────────────────────────────────────────────┐
│                           APPLICATION LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       Express.js Server                              │  │
│  │                       (backend/server.js)                            │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │    Auth     │  │    Trips    │  │    Zones    │                   │  │
│  │  │  Controller │  │  Controller │  │  Controller │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │  Analytics  │  │    Admin    │  │   Custom    │                   │  │
│  │  │  Controller │  │  Controller │  │ Algorithms  │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │  Middleware │  │   Routes    │  │   Utils     │                   │  │
│  │  │ • auth.js   │  │ • auth.js   │  │ • validators│                   │  │
│  │  │ • error.js  │  │ • trips.js  │  │ • logger.js │                   │  │
│  │  │ • audit.js  │  │ • admin.js  │  │ • csvParser │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                    ┌─────────┴─────────┐                                   │
│                    │  JWT Auth Layer   │                                   │
│                    │  Role-based Access│                                   │
│                    └─────────┬─────────┘                                   │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               │ MySQL Protocol
┌──────────────────────────────▼────────────────────────────────────────────┐
│                           DATA LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    MySQL Database (urban_mobility)                  │  │
│  │                                                                     │  │
│  │  ┌────────────────┐    ┌─────────────┐    ┌─────────────┐           │  │
│  │  │    zones       │────│    trips    │────│    users    │           │  │
│  │  │  (265 rows)    │    │  (6.5M rows)│    │   (multi)   │           │  │
│  │  │  •location_id  │    │  •trip_id   │    │  •user_id   │           │  │
│  │  │  •borough      │    │  •pickup_dt │    │  •username  │           │  │
│  │  │  •zone_name    │    │  •dropoff_dt│    │  •password  │           │  │
│  │  │  •service_zone │    │  •distance  │    │  •role      │           │  │
│  │  └────────────────┘    │  •fare      │    │  •is_active │           │  │
│  │                        └─────────────┘    └─────────────┘           │  │
│  │                           │                    │                    │  │
│  │  ┌─────────────┐      ┌────▼────┐    ┌────▼─────┐                   │  │
│  │  │trip_agg-    │◄─────│ audit_  │────│ api_keys │                   │  │
│  │  │regates      │      │  log    │    │          │                   │  │
│  │  │•pre-computed│      │•actions │    │•program- │                   │  │
│  │  │•fast queries│      │•audit   │    │•matic    │                   │  │
│  │  └─────────────┘      │•tracking│    │•access   │                   │  │
│  │                       └─────────┘    └──────────┘                   │  │
│  │                                                                     │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │  │
│  │  │data_cleaning│    │    Views    │    │  Indexes    │              │  │
│  │  │    logs     │    │  (6 views)  │    │  (25+)      │              │  │
│  │  └─────────────┘    └─────────────┘    └─────────────┘              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA PROCESSING PIPELINE                            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │  Raw    │───►│  Clean  │───►│Validate │───►│ Feature │───►│  Load   │    │
│  │  CSV    │    │  Data   │    │         │    │Engineer │    │  to DB  │    │
│  │7.6M rec │    │6.5M rec │    │         │    │8 derived│    │         │    │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    │
│                                                                             │
│  • Missing values: handled with imputation   • Duplicates: O(n) HashMap     │
│  • Outliers: IQR method + domain rules        • Batch size: 1000 records    │
│  • Excluded: ~15% (logged in data_cleaning_log)                             │
└─────────────────────────────────────────────────────────────────────────────┘














nyc-taxi-explorer/
├── backend/✅
│   ├── server.js ✅                           # Main server entry point
│   ├── config/✅
│   │   └── database.js ✅                     # Database connection pool
│   ├── controllers/✅
│   │   ├── authController.js  ✅              # Authentication logic
│   │   ├── tripController.js ✅               # Trip CRUD operations
│   │   ├── zoneController.js ✅               # Zone CRUD operations
│   │   ├── analyticsController.js ✅          # Analytics and insights
│   │   └── adminController.js ✅              # System administration
│   ├── routes/ ✅
│   │   ├── auth.js ✅                         # Auth routes
│   │   ├── trips.js ✅                        # Trip routes
│   │   ├── zones.js ✅                        # Zone routes
│   │   ├── analytics.js ✅                    # Analytics routes
│   │   └── admin.js ✅                        # Admin routes
│   ├── models/ ✅
│   │   ├── Trip.js ✅                         # Trip model
│   │   ├── Zone.js ✅                         # Zone model
│   │   ├── User.js ✅                         # User model
│   │   └── AuditLog.js ✅                     # Audit log model
│   ├── middleware/ ✅
│   │   ├── auth.js ✅                         # JWT verification
│   │   ├── validation.js ✅                   # Input validation
│   │   ├── auditLogger.js ✅                  # Audit logging
│   │   └── errorHandler.js ✅                 # Global error handler
│   └── utils/ ✅
│       ├── customAlgorithms.js ✅             # Manual algorithms
│       ├── dataProcessor.js ✅                # Data cleaning pipeline
│       ├── csvParser.js ✅                    # CSV parsing utilities
│       ├── validators.js ✅                   # Input validators
│       └── logger.js ✅                       # Application logging
├── frontend/ ✅
│   ├── index.html                             # Public dashboard
│   ├── admin.html ✅                          # Admin panel
│   ├── driver.html ✅                         # Driver portal
│   ├── client.html ✅                         # Client portal
│   ├── css/
│   │   └── styles.css                          # Global styles
│   └── js/ ✅
│       ├── api.js ✅                          # API client
│       ├── auth.js ✅                         # Authentication UI
│       ├── dashboard.js ✅                    # Dashboard logic
│       ├── admin.js ✅                        # Admin panel logic
│       ├── driver.js ✅                       # Driver portal logic
│       ├── client.js ✅                       # Client portal logic
│       └── charts.js ✅                       # Chart.js       configurations
├── database/ ✅
│   └── schema.sql ✅                             # Complete database schema
├── scripts/ ✅
│   ├── loadZones.js ✅                           # Load zone data from CSV
│   ├── processTrips.js ✅                        # Process trip data
│   └── createAdmin.js ✅                         # Create admin user
├── data/ ✅
│   └── taxi_zone_lookup.csv ✅                   # NYC taxi zones (265)
├── docs/
│   ├── architecture_diagram.png                  # System architecture
│   ├── technical_report.pdf                      # 20+ page report
│   └── team_participation_sheet.pdf              # Team roles
├── logs/ ✅
│   └── app.log ✅                                # Application logs
├── .env.example ✅                               # Environment template
├── package.json ✅                               # Dependencies
├── README.md                                      # This file
├── setup.bat ✅                                  # Windows setup script
├── setup.sh ✅                                   # Mac/Linux setup script
└── video_walkthrough.mp4                          # 5-minute demo