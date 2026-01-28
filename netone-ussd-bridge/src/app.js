const express = require('express');
const cors = require('cors');
const bundleRoutes = require('./routes/bundle.route');
const { connectDB } = require('./config/database.config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Auth Middleware
app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Valid API key required in x-api-key header'
        });
    }
    next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Routes
app.use('/api/v1/bundles', bundleRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableEndpoints: {
            bundles: {
                getAll: 'GET /api/v1/bundles',
                getData: 'GET /api/v1/bundles/data',
                getDataByCategory: 'GET /api/v1/bundles/data/:category',
                getSocialMedia: 'GET /api/v1/bundles/social-media',
                getSMS: 'GET /api/v1/bundles/sms',
                buy: 'POST /api/v1/bundles/buy',
                status: 'GET /api/v1/bundles/status/:taskId'
            }
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Initialize DB
connectDB();

module.exports = app;