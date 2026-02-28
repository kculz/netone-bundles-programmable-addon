const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundle.controller');

// POST /api/v1/bundles/buy
router.post('/buy', bundleController.buyBundle);

// GET /api/v1/bundles/status/:taskId
router.get('/status/:id', async (req, res) => {
    const Task = require('../models/task.model');
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
});

module.exports = router;
