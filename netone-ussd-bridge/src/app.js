const express = require('express');
const cors = require('cors');
const bundleRoutes = require('./routes/bundle.route');
const { connectDB } = require('./config/database.config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware (Simple Example)
app.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// Routes
app.use('/api/v1/bundles', bundleRoutes);

// Initialize DB
connectDB();

module.exports = app;
