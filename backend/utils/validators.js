const validators = {
    // Validate email format
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    // Validate date
    isValidDate: (date) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d);
    },
    
    // Validate trip distance
    isValidDistance: (distance) => {
        const num = parseFloat(distance);
        return !isNaN(num) && num >= 0 && num <= 100;
    },
    
    // Validate fare amount
    isValidFare: (fare) => {
        const num = parseFloat(fare);
        return !isNaN(num) && num >= 0 && num <= 500;
    },
    
    // Validate passenger count
    isValidPassengerCount: (count) => {
        const num = parseInt(count);
        return !isNaN(num) && num >= 0 && num <= 6;
    },
    
    // Validate location ID
    isValidLocationId: (id) => {
        const num = parseInt(id);
        return !isNaN(num) && num >= 1 && num <= 265;
    },
    
    // Validate trip duration
    isValidDuration: (pickup, dropoff) => {
        const start = new Date(pickup);
        const end = new Date(dropoff);
        const duration = (end - start) / (1000 * 60); // minutes
        return duration >= 1 && duration <= 180;
    },
    
    // Validate speed
    isValidSpeed: (distance, duration) => {
        const speed = distance / (duration / 60);
        return speed <= 100;
    },
    
    // Validate trip object
    validateTrip: (trip) => {
        const errors = [];
        
        if (!trip.pickup_datetime || !validators.isValidDate(trip.pickup_datetime)) {
            errors.push('Invalid pickup datetime');
        }
        
        if (!trip.dropoff_datetime || !validators.isValidDate(trip.dropoff_datetime)) {
            errors.push('Invalid dropoff datetime');
        }
        
        if (!validators.isValidLocationId(trip.pickup_location_id)) {
            errors.push('Invalid pickup location ID');
        }
        
        if (!validators.isValidLocationId(trip.dropoff_location_id)) {
            errors.push('Invalid dropoff location ID');
        }
        
        if (trip.trip_distance && !validators.isValidDistance(trip.trip_distance)) {
            errors.push('Invalid trip distance');
        }
        
        if (trip.total_amount && !validators.isValidFare(trip.total_amount)) {
            errors.push('Invalid fare amount');
        }
        
        if (trip.passenger_count && !validators.isValidPassengerCount(trip.passenger_count)) {
            errors.push('Invalid passenger count');
        }
        
        // Validate duration
        if (trip.pickup_datetime && trip.dropoff_datetime) {
            if (!validators.isValidDuration(trip.pickup_datetime, trip.dropoff_datetime)) {
                errors.push('Invalid trip duration');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    // Validate zone
    validateZone: (zone) => {
        const errors = [];
        
        if (!zone.location_id || zone.location_id < 1 || zone.location_id > 265) {
            errors.push('Invalid location ID');
        }
        
        if (!zone.borough || zone.borough.trim() === '') {
            errors.push('Borough is required');
        }
        
        if (!zone.zone_name || zone.zone_name.trim() === '') {
            errors.push('Zone name is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    // Validate user
    validateUser: (user) => {
        const errors = [];
        
        if (!user.username || user.username.length < 3) {
            errors.push('Username must be at least 3 characters');
        }
        
        if (!user.email || !validators.isValidEmail(user.email)) {
            errors.push('Invalid email format');
        }
        
        if (user.password && user.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        
        if (user.role && !['admin', 'viewer'].includes(user.role)) {
            errors.push('Invalid role');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

module.exports = validators;