const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Default error
    let status = 500;
    let message = 'Internal server error';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        status = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized access';
    } else if (err.code === 'ER_DUP_ENTRY') {
        status = 400;
        message = 'Duplicate entry found';
    } else if (err.code === 'ER_NO_REFERENCED_ROW') {
        status = 400;
        message = 'Referenced record does not exist';
    }
    
    res.status(status).json({
        error: message,
        timestamp: new Date().toISOString()
    });
};

module.exports = errorHandler;